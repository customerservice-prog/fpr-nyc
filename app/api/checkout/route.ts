export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { getItemAvailability } from '@/lib/availability'
import { evaluateRentalRestrictions } from '@/lib/rentalRestrictions'
import { DeliveryQuoteError, getDeliveryQuote, requireDeliveryMethod, requireMatchingDeliveryFee } from '@/lib/delivery'

async function reserveExactTimeSlot(tx: any, date: Date, time: string, type: 'delivery' | 'pickup', defaultCapacity: number) {
  const dayDate = new Date(date); dayDate.setHours(0,0,0,0)
  const existing = await tx.exactTimeSlot.findUnique({ where: { date_time_type: { date: dayDate, time, type } } })
  if (existing) {
    if (existing.isBlocked || existing.bookedCount >= existing.capacity) return false
    await tx.exactTimeSlot.update({ where: { id: existing.id }, data: { bookedCount: { increment: 1 } } })
    return true
  }
  await tx.exactTimeSlot.create({ data: { date: dayDate, time, type, capacity: defaultCapacity, bookedCount: 1, isBlocked: false } })
  return true
}

export async function POST(request: NextRequest) {
  try {
    const { orderId, amount, saveCard, tipAmount } = await request.json()

    if (!orderId || !amount) {
      return NextResponse.json({ error: 'orderId and amount required' }, { status: 400 })
    }

    const requestedAmount = Number(amount)
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const tip = Number(tipAmount) || 0

    let order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, customer: true } })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status === 'incomplete') {
      requireDeliveryMethod(order.deliveryType)
      if (order.checkoutStage === 'details_completed') {
        return NextResponse.json({ error: 'This saved checkout still needs final pricing. Please return to checkout to continue.' }, { status: 409 })
      }
      const restriction = await evaluateRentalRestrictions({
        customerId: order.customerId,
        emails: [order.customer?.email || ''],
        phones: [order.customer?.phone || ''],
        address: order.eventAddress ? { street1: order.eventAddress, city: order.eventCity, state: order.eventState, zip: order.eventZip } : null,
      })
      if (restriction.matched) {
        return NextResponse.json({ error: 'We are unable to complete this reservation online. Please contact our NYC team.' }, { status: 403 })
      }
      const deliveryQuote = await getDeliveryQuote(order.eventZip)
      requireMatchingDeliveryFee(order.deliveryFee, deliveryQuote)
      for (const line of order.items) {
        if (!line.itemId || line.quantity <= 0) continue
        const available = await getItemAvailability(line.itemId, order.eventDate)
        if (line.quantity > available) return NextResponse.json({ error: '"' + line.itemName + '" is no longer available in the saved quantity. Please contact us or restart checkout.' }, { status: 409 })
      }
      const exactSettings = await prisma.exactTimeSettings.findFirst()
      const capacity = exactSettings?.defaultCapacityPerSlot ?? 1
      if ((order.exactDeliveryRequested && order.exactDeliveryTime) || (order.pickupType === 'exact' && order.exactPickupTime)) {
        if (exactSettings?.enabled === false) return NextResponse.json({ error: 'Exact-time scheduling is currently unavailable. Please contact our office.' }, { status: 409 })
        const reserved = await prisma.$transaction(async tx => {
          if (order!.exactDeliveryRequested && order!.exactDeliveryTime && !await reserveExactTimeSlot(tx, order!.eventDate, order!.exactDeliveryTime, 'delivery', capacity)) return false
          if (order!.pickupType === 'exact' && order!.exactPickupTime && !await reserveExactTimeSlot(tx, order!.eventDate, order!.exactPickupTime, 'pickup', capacity)) return false
          return true
        })
        if (!reserved) return NextResponse.json({ error: 'An exact scheduling time on this saved checkout is no longer available. Please contact our office.' }, { status: 409 })
      }
      order = await prisma.order.update({
        where: { id: order.id },
        data: { status: 'quote', checkoutStage: 'payment_started', checkoutLastSeenAt: new Date() },
        include: { items: true, customer: true },
      })
    }

    // SECURITY: never trust the client-supplied amount blindly. Compute the real
    // amount owed on the server from the order record and enforce it as bounds.
    const amountPaid = order.amountPaid || 0
    const remainingBalance = Math.max(order.totalAmount - amountPaid, 0)

    if (remainingBalance <= 0 && tip <= 0) {
      return NextResponse.json({ error: 'This order has already been paid in full' }, { status: 400 })
    }

    const minRequired = amountPaid === 0 && order.depositAmount > 0
      ? Math.min(order.depositAmount, remainingBalance) 
      : 0.5

    if (requestedAmount < minRequired - 0.01) {
      return NextResponse.json(
        { error: 'Minimum payment required is $' + minRequired.toFixed(2) },
        { status: 400 }
      )
    }

    if (requestedAmount > remainingBalance + tip + 0.01) {
      return NextResponse.json(
        { error: 'Amount exceeds the remaining balance of $' + remainingBalance.toFixed(2) },
        { status: 400 }
      )
    }

    if (!stripe || !process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_live_xxx') {
      return NextResponse.json(
        { error: 'Online payment is temporarily unavailable. Please contact Friendly Party Rental NYC before paying.' },
        { status: 503 }
      )
    }

    let stripeCustomerId = order.stripeCustomerId || undefined

    if (saveCard && !stripeCustomerId) {
      const customer = await stripe.customers.create({
        metadata: { orderId, orderNumber: order.orderNumber },
      })
      stripeCustomerId = customer.id
      await prisma.order.update({
        where: { id: orderId },
        data: { stripeCustomerId },
      })
    }

    // Reduce the risk of duplicate/overlapping payments: if this order has a
    // previous PaymentIntent that was created but never completed (e.g. the
    // customer's first attempt appeared to fail and they are retrying),
    // cancel it first so two live payment intents can never both be
    // confirmed for the same balance.
    if (order.stripePaymentId) {
      try {
        const previousIntent = await stripe.paymentIntents.retrieve(order.stripePaymentId)
        if (
          previousIntent.status === 'requires_payment_method' ||
          previousIntent.status === 'requires_confirmation' ||
          previousIntent.status === 'requires_action'
        ) {
          await stripe.paymentIntents.cancel(previousIntent.id)
        }
      } catch (err) {
        console.error('Could not cancel previous payment intent:', err)
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(requestedAmount * 100),
      currency: 'usd',
      ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
      ...(saveCard ? { setup_future_usage: 'off_session' } : {}),
      metadata: { orderId, orderNumber: order.orderNumber },
    })

    await prisma.order.update({
      where: { id: orderId },
      data: { stripePaymentId: paymentIntent.id, checkoutStage: 'payment_started', checkoutLastSeenAt: new Date() },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error) {
    if (error instanceof DeliveryQuoteError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Payment failed' }, { status: 500 })
  }
}
