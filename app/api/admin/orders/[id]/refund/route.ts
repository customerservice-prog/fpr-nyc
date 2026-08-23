export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { paymentId, amount } = await request.json()

    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId is required' }, { status: 400 })
    }

    const order = await prisma.order.findUnique({ where: { id: (await params).id } })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
    if (!payment || payment.orderId !== order.id) {
      return NextResponse.json({ error: 'Payment not found on this order' }, { status: 404 })
    }

    if (payment.amount <= 0) {
      return NextResponse.json({ error: 'This entry is not a refundable payment' }, { status: 400 })
    }

    if (!payment.stripePaymentId || payment.stripePaymentId.startsWith('simulated_')) {
      return NextResponse.json({ error: 'This payment has no associated Stripe charge to refund' }, { status: 400 })
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 400 })
    }

    const refundAmount = amount ? Number(amount) : payment.amount
    if (!refundAmount || refundAmount <= 0 || refundAmount > payment.amount + 0.01) {
      return NextResponse.json({ error: 'Invalid refund amount' }, { status: 400 })
    }

    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentId,
      amount: Math.round(refundAmount * 100),
    })

    const newAmountPaid = Math.max(order.amountPaid - refundAmount, 0)
    const newBalanceDue = Math.max(order.totalAmount - newAmountPaid, 0)

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        amountPaid: newAmountPaid,
        balanceDue: newBalanceDue,
        payments: {
          create: {
            amount: -refundAmount,
            method: 'refund',
            stripePaymentId: refund.id,
            notes: 'Refund issued via admin for payment ' + payment.id,
            recordedByName: session.user?.name || null,
          },
        },
      },
      include: { payments: true },
    })

    return NextResponse.json({ success: true, refund, order: updated })
  } catch (error) {
    console.error('Refund error:', error)
    return NextResponse.json({ error: 'Failed to process refund' }, { status: 500 })
  }
}
