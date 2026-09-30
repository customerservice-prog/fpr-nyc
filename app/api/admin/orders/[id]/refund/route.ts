export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { describeStripeError, isNycPaymentsUnavailable, requireNycStripe } from '@/lib/stripe'
import { NYC_LOCATION, NYC_PAYMENT_APP, dollarsToCents, nycIdempotencyKey } from '@/lib/nycPaymentMetadata'
import { PaymentAssociationError, loadOrderForIntent, reconcileNycRefunds } from '@/lib/nycStripeReconcile'

// Staff refund of an NYC card payment.
// - NYC account guard runs before the refund is created.
// - The refundable amount is computed from Stripe (amount received minus refunds
//   already issued, including ones made in the Stripe Dashboard), not from the browser.
// - Stripe idempotency prevents a double-click from refunding twice.
// - The order ledger is updated by the same reconciliation the webhook uses, so a
//   refund that later fails in Stripe restores the order balance automatically.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json().catch(() => ({}))
    const paymentId = typeof body?.paymentId === 'string' ? body.paymentId : ''
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
    if (payment.amount <= 0 || payment.status !== 'succeeded') {
      return NextResponse.json({ error: 'This entry is not a refundable payment' }, { status: 400 })
    }
    if (!payment.stripePaymentId || !/^pi_[A-Za-z0-9]+$/.test(payment.stripePaymentId)) {
      return NextResponse.json({ error: 'This payment has no associated Stripe charge to refund' }, { status: 400 })
    }

    const stripe = await requireNycStripe('refund')
    const intent = await stripe.paymentIntents.retrieve(payment.stripePaymentId)
    const { order: linkedOrder } = await loadOrderForIntent(intent)
    if (linkedOrder.id !== order.id || intent.status !== 'succeeded') {
      return NextResponse.json({ error: 'This payment does not match a completed NYC charge for this order' }, { status: 400 })
    }

    let alreadyRefundedCents = 0
    for await (const refund of stripe.refunds.list({ payment_intent: intent.id, limit: 100 })) {
      if (refund.status === 'succeeded' || refund.status === 'pending' || refund.status === 'requires_action') alreadyRefundedCents += refund.amount
    }
    const capturedCents = Math.min(intent.amount_received, Math.round(payment.amount * 100))
    const refundableCents = Math.max(capturedCents - alreadyRefundedCents, 0)
    const requestedCents = body?.amount === undefined || body?.amount === null || body?.amount === '' ? refundableCents : dollarsToCents(body.amount)
    if (!Number.isSafeInteger(requestedCents) || requestedCents <= 0 || requestedCents > refundableCents) {
      return NextResponse.json({ error: 'Invalid refund amount. Up to $' + (refundableCents / 100).toFixed(2) + ' of this payment can still be refunded.' }, { status: 400 })
    }

    const requestId = typeof body?.requestId === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(body.requestId) ? body.requestId : null
    const refund = await stripe.refunds.create({
      payment_intent: intent.id,
      amount: requestedCents,
      metadata: {
        location: NYC_LOCATION,
        app: NYC_PAYMENT_APP,
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentId: payment.id,
        requestedBy: (session.user?.name || 'staff').slice(0, 80),
      },
    }, {
      // Same payment, same amount, same prior-refund total => same refund (double-click safe).
      idempotencyKey: nycIdempotencyKey(['refund', payment.id, requestedCents, requestId || alreadyRefundedCents]),
    })

    const reconciled = await reconcileNycRefunds(stripe, intent.id)
    const updated = await prisma.order.findUnique({ where: { id: order.id }, include: { payments: true } })
    return NextResponse.json({ success: true, refund: { id: refund.id, status: refund.status, amount: refund.amount / 100 }, reconciled, order: updated })
  } catch (error) {
    if (isNycPaymentsUnavailable(error)) {
      console.error('[refund] Blocked:', error.reason)
      return NextResponse.json({ error: 'Refunds are unavailable until the NYC Stripe account and webhook are fully configured.' }, { status: 503 })
    }
    if (error instanceof PaymentAssociationError) {
      console.error('[refund] Payment/order mismatch:', error.reason)
      return NextResponse.json({ error: 'This payment does not belong to this NYC order' }, { status: 400 })
    }
    console.error('[refund] Refund failed:', describeStripeError(error))
    return NextResponse.json({ error: 'Failed to process refund' }, { status: 500 })
  }
}
