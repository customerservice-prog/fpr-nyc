export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { finalizePayment } from '@/lib/payments'

export async function POST(request: NextRequest) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 })
  }

const signature = request.headers.get('stripe-signature') || ''
  const rawBody = await request.text()

let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

if (event.type === 'payment_intent.succeeded') {
  const intent = event.data.object as { id: string; amount: number; metadata?: { orderId?: string } }
  const orderId = intent.metadata?.orderId
  if (orderId) {
    try {
      await finalizePayment({
        orderId,
        amount: intent.amount / 100,
        stripePaymentId: intent.id,
      })
    } catch (err) {
      console.error('Webhook finalizePayment error:', err)
    }
  }
}

if (event.type === 'payment_intent.processing') {
  const intent = event.data.object as { id: string; amount: number; metadata?: { orderId?: string } }
  const orderId = intent.metadata?.orderId
  if (orderId) {
    try {
      const existing = await prisma.payment.findFirst({ where: { stripePaymentId: intent.id + '_pending' } })
      if (!existing) {
        await prisma.payment.create({
          data: {
            orderId,
            amount: 0,
            pendingAmount: intent.amount / 100,
            method: 'card',
            stripePaymentId: intent.id + '_pending',
            status: 'pending',
            notes: 'Payment processing (pending) via Stripe',
          },
        })
      }
    } catch (err) {
      console.error('Webhook pending payment log error:', err)
    }
  }
}

if (event.type === 'payment_intent.payment_failed') {
  const intent = event.data.object as { id: string; amount: number; metadata?: { orderId?: string }; last_payment_error?: { message?: string } }
  const orderId = intent.metadata?.orderId
  if (orderId) {
    try {
      await prisma.payment.create({
        data: {
          orderId,
          amount: 0,
          pendingAmount: intent.amount / 100,
          method: 'card',
          stripePaymentId: intent.id + '_failed_' + Date.now(),
          status: 'failed',
          notes: 'Payment failed via Stripe' + (intent.last_payment_error?.message ? ': ' + intent.last_payment_error.message : ''),
        },
      })
    } catch (err) {
      console.error('Webhook failed payment log error:', err)
    }
  }
}

return NextResponse.json({ received: true })
}
