export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { describeStripeError, isNycPaymentsUnavailable, requireNycStripe } from '@/lib/stripe'
import { NYC_PAYMENTS_UNAVAILABLE_MESSAGE } from '@/lib/nycStripeGuard'
import { buildNycPaymentMetadata, checkNycPaymentMetadata, dollarsToCents, nycIdempotencyKey } from '@/lib/nycPaymentMetadata'
import { NYC_SERVER_PRICED_VERSIONS, toCents } from '@/lib/nycCheckoutPricing'
import { aggregateQuantities } from '@/lib/nycCheckoutPricingServer'
import { recordSucceededIntent } from '@/lib/nycStripeReconcile'
import { prisma } from '@/lib/prisma'
import { getItemAvailability } from '@/lib/availability'
import { evaluateRentalRestrictions } from '@/lib/rentalRestrictions'
import { DeliveryQuoteError, getDeliveryQuote, requireDeliveryMethod, requireMatchingDeliveryFee } from '@/lib/delivery'

// Creates (or safely reuses) the Stripe PaymentIntent for an NYC order.
// Amounts are validated against the order record on the server; the browser only
// chooses how much of the server-computed balance to pay today plus an optional tip.

const STRIPE_MINIMUM_CHARGE_CENTS = 50
const REUSABLE_STATUSES = new Set(['requires_payment_method', 'requires_confirmation', 'requires_action'])

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

function isStripeMissingResource(error: unknown): boolean {
  return (error as { code?: string })?.code === 'resource_missing'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const orderId = typeof body?.orderId === 'string' ? body.orderId : ''
    const amountCents = dollarsToCents(body?.amount)
    const tipCents = body?.tipAmount === undefined || body?.tipAmount === null || body?.tipAmount === '' ? 0 : dollarsToCents(body.tipAmount)
    const saveCard = body?.saveCard === true

    if (!orderId || !Number.isSafeInteger(amountCents) || amountCents <= 0) {
      return NextResponse.json({ error: 'orderId and a valid amount are required' }, { status: 400 })
    }
    if (!Number.isSafeInteger(tipCents) || tipCents < 0 || tipCents > amountCents) {
      return NextResponse.json({ error: 'Invalid tip amount' }, { status: 400 })
    }
    if (amountCents < STRIPE_MINIMUM_CHARGE_CENTS) {
      return NextResponse.json({ error: 'The minimum online payment is $0.50' }, { status: 400 })
    }

    // Fail closed before any database or Stripe write: go-live switch, full NYC
    // configuration, and proof that the secret key belongs to NYC_STRIPE_ACCOUNT_ID.
    const stripe = await requireNycStripe('charge')

    let order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, customer: true } })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (order.status === 'canceled') {
      return NextResponse.json({ error: 'This order has been canceled. Please contact us.' }, { status: 409 })
    }
    if (order.source === 'online' && !NYC_SERVER_PRICED_VERSIONS.includes(order.pricingVersion || '')) {
      // Totals on this online order were not computed by the server pricing engine.
      return NextResponse.json({ error: 'We need to confirm your total before payment. Please restart checkout or contact us.' }, { status: 409 })
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
      const quantities = aggregateQuantities(order.items.map(line => ({ id: line.itemId || '', quantity: line.quantity })))
      for (const [itemId, quantity] of quantities) {
        const available = await getItemAvailability(itemId, order.eventDate)
        if (quantity > available) {
          const name = order.items.find(line => line.itemId === itemId)?.itemName || 'An item'
          return NextResponse.json({ error: '"' + name + '" is no longer available in the saved quantity. Please contact us or restart checkout.' }, { status: 409 })
        }
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

    // SECURITY: the amount owed comes from the order record, never from the browser.
    const principalCents = amountCents - tipCents
    const totalCents = toCents(Number(order.totalAmount || 0))
    const paidCents = toCents(Number(order.amountPaid || 0))
    const remainingCents = Math.max(totalCents - paidCents, 0)

    if (remainingCents <= 0 && tipCents <= 0) {
      return NextResponse.json({ error: 'This order has already been paid in full' }, { status: 400 })
    }
    if (principalCents > remainingCents) {
      return NextResponse.json({ error: 'Amount exceeds the remaining balance of $' + (remainingCents / 100).toFixed(2) }, { status: 400 })
    }
    const depositCents = toCents(Number(order.depositAmount || 0))
    const minimumCents = remainingCents <= 0
      ? 0
      : paidCents === 0 && depositCents > 0
        ? Math.min(depositCents, remainingCents)
        : Math.min(STRIPE_MINIMUM_CHARGE_CENTS, remainingCents)
    if (principalCents < minimumCents) {
      return NextResponse.json({ error: 'Minimum payment required is $' + (minimumCents / 100).toFixed(2) }, { status: 400 })
    }
    if (tipCents > Math.max(totalCents, 0)) {
      return NextResponse.json({ error: 'Please contact us to add a tip larger than the order total.' }, { status: 400 })
    }

    const metadata = buildNycPaymentMetadata({
      orderId: order.id,
      orderNumber: order.orderNumber,
      kind: paidCents === 0 ? 'checkout' : 'balance',
      principalCents,
      tipCents,
    })

    // Duplicate submission / retry protection: reuse the open PaymentIntent for the
    // same order and amount; cancel an open one for a different amount before
    // creating a replacement, so two live intents can never both be paid.
    if (order.stripePaymentId && order.stripePaymentId.startsWith('pi_')) {
      let previous: Stripe.PaymentIntent | null = null
      try {
        previous = await stripe.paymentIntents.retrieve(order.stripePaymentId)
      } catch (error) {
        if (!isStripeMissingResource(error)) throw error
      }
      if (previous) {
        const previousCheck = checkNycPaymentMetadata(previous.metadata, order)
        if (previous.status === 'succeeded' || previous.status === 'processing') {
          const recorded = await prisma.payment.findUnique({ where: { stripePaymentId: previous.id } })
          if (!recorded) {
            // Money was already captured (or is in flight) for this order but not yet
            // recorded. Record a verified success now and stop, so the customer is
            // never charged twice for the same balance.
            if (previous.status === 'succeeded' && previousCheck.ok) {
              try { await recordSucceededIntent(previous, { sendReceipt: true }) } catch (error) { console.error('[checkout] Could not record earlier payment', previous.id, error) }
            }
            return NextResponse.json({ error: 'We found an earlier payment for this order that is still being confirmed. Please refresh to see your updated balance before paying again.' }, { status: 409 })
          }
        } else if (REUSABLE_STATUSES.has(previous.status)) {
          const sameRequest = previousCheck.ok
            && previous.amount === amountCents
            && previous.currency === 'usd'
            && previousCheck.tipCents === tipCents
            && previousCheck.principalCents === principalCents
            && (previous.setup_future_usage === 'off_session') === saveCard
          if (sameRequest && previous.client_secret) {
            return NextResponse.json({ clientSecret: previous.client_secret, paymentIntentId: previous.id, reused: true })
          }
          await stripe.paymentIntents.cancel(previous.id, undefined, { idempotencyKey: nycIdempotencyKey(['cancel', previous.id]) })
        }
      }
    }

    let stripeCustomerId = order.stripeCustomerId || undefined
    if (saveCard && !stripeCustomerId) {
      const customer = await stripe.customers.create({
        metadata: buildNycPaymentMetadata({ orderId: order.id, orderNumber: order.orderNumber, kind: 'checkout', principalCents: 0, tipCents: 0 }),
      }, { idempotencyKey: nycIdempotencyKey(['customer', order.id]) })
      stripeCustomerId = customer.id
      await prisma.order.update({ where: { id: order.id }, data: { stripeCustomerId } })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      payment_method_types: ['card'],
      description: 'Friendly Party Rental NYC order ' + order.orderNumber,
      ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
      ...(saveCard ? { setup_future_usage: 'off_session' as const } : {}),
      metadata,
    }, {
      idempotencyKey: nycIdempotencyKey(['pi', order.id, amountCents, tipCents, saveCard ? 1 : 0, stripeCustomerId || 'guest', order.stripePaymentId || 'first']),
    })

    await prisma.order.update({
      where: { id: order.id },
      data: { stripePaymentId: paymentIntent.id, checkoutStage: 'payment_started', checkoutLastSeenAt: new Date() },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error) {
    if (isNycPaymentsUnavailable(error)) {
      console.error('[checkout] Payment blocked:', error.reason)
      return NextResponse.json({ error: NYC_PAYMENTS_UNAVAILABLE_MESSAGE, code: 'payments_unavailable' }, { status: 503 })
    }
    if (error instanceof DeliveryQuoteError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[checkout] Could not start payment:', describeStripeError(error))
    return NextResponse.json({ error: 'Payment could not be started. Please try again or contact us.' }, { status: 502 })
  }
}
