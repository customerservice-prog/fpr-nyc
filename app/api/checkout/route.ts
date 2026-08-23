export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

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

    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
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
      await prisma.order.update({
        where: { id: orderId },
        data: { stripePaymentId: 'simulated_' + Date.now() },
      })
      return NextResponse.json({
        success: true,
        simulated: true,
        message: 'Payment simulated (Stripe keys not configured)',
      })
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
      data: { stripePaymentId: paymentIntent.id },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Payment failed' }, { status: 500 })
  }
}
