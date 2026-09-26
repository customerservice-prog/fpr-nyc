export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { finalizePayment } from '@/lib/payments'
import { buildPaymentReceipt } from '@/lib/paymentReceipt'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { amount, tipAmount, stripePaymentId, saveCard, sendReceipt } = await request.json()
    let paidAmount = Number(amount) || 0
    let verifiedIntent: any = null
    let savedPaymentMethodId: string | null = null
    let stripeCustomerId: string | null = null

    const order = await prisma.order.findUnique({ where: { id: (await params).id } })
    if (!order) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (stripePaymentId && stripePaymentId.startsWith('simulated_')) {
      // Local/dev fallback only. Simulated payments are never advertising conversion evidence.
      if (!paidAmount) return NextResponse.json({ error: 'Simulated payment amount is required' }, { status: 400 })
    } else if (stripePaymentId && stripe) {
      const intent = await stripe.paymentIntents.retrieve(stripePaymentId)
      if (intent.status !== 'succeeded') {
        return NextResponse.json({ error: 'Payment has not completed yet' }, { status: 409 })
      }
      if (intent.metadata?.orderId !== order.id) {
        return NextResponse.json({ error: 'Payment does not match this order' }, { status: 400 })
      }
      if (!Number.isSafeInteger(intent.amount_received) || intent.amount_received <= 0) {
        return NextResponse.json({ error: 'Payment amount could not be verified' }, { status: 400 })
      }
      paidAmount = intent.amount_received / 100
      verifiedIntent = intent
      if (saveCard) {
        savedPaymentMethodId = typeof intent.payment_method === 'string' ? intent.payment_method : (intent.payment_method?.id || null)
        stripeCustomerId = typeof intent.customer === 'string' ? intent.customer : (intent.customer?.id || order.stripeCustomerId || null)
      }
    } else {
      return NextResponse.json({ error: 'Payment could not be verified' }, { status: 400 })
    }

    const updated = await finalizePayment({
      orderId: order.id,
      tipAmount: Number(tipAmount) || 0,
      amount: paidAmount,
      stripePaymentId: stripePaymentId || null,
      sendReceipt: sendReceipt !== false,
      ...(savedPaymentMethodId ? { savedPaymentMethodId } : {}),
      ...(stripeCustomerId ? { stripeCustomerId } : {}),
      ...(saveCard ? { autopayEnabled: true } : {}),
    })

    const receipt = verifiedIntent ? buildPaymentReceipt(verifiedIntent, updated as any) : null
    return NextResponse.json({ success: true, order: updated, receipt })
  } catch (error) {
    console.error('Confirm payment error:', error)
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
  }
}
