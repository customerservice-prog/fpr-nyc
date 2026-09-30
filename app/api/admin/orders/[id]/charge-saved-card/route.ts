export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { describeStripeError, isNycPaymentsUnavailable, requireNycStripe } from '@/lib/stripe'
import { buildNycPaymentMetadata, dollarsToCents, nycIdempotencyKey } from '@/lib/nycPaymentMetadata'
import { recordSucceededIntent } from '@/lib/nycStripeReconcile'

// Manual "Charge Saved Card" action for staff (damage, cleaning, unreturned items).
// Staff never see or enter card numbers; only the customer's saved Stripe token is used.
// Safeguards: NYC account guard + go-live switch, server metadata (location=nyc),
// Stripe idempotency (a double-click cannot charge twice), and the order total is
// raised atomically with the recorded payment only after Stripe confirms success.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const amountCents = dollarsToCents(body?.amount)
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''
    if (!Number.isSafeInteger(amountCents) || amountCents < 50) {
      return NextResponse.json({ error: 'Enter a valid amount (minimum $0.50)' }, { status: 400 })
    }
    if (!reason) {
      return NextResponse.json({ error: 'A reason is required (e.g. damage, item not returned)' }, { status: 400 })
    }

    const { id: orderId } = await params
    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (!order.stripeCustomerId || !order.savedPaymentMethodId) {
      return NextResponse.json({ error: 'No card on file for this order. The customer must have paid by card and had their card saved before it can be charged.' }, { status: 400 })
    }

    const stripe = await requireNycStripe('charge')
    const requestId = typeof body?.requestId === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(body.requestId) ? body.requestId : null
    // Without a client request id, identical charges within the same minute are treated as one.
    const idempotencyKey = nycIdempotencyKey(['saved-card', order.id, amountCents, requestId || Math.floor(Date.now() / 60000), requestId ? '' : reason.slice(0, 40)])

    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      customer: order.stripeCustomerId,
      payment_method: order.savedPaymentMethodId,
      off_session: true,
      confirm: true,
      description: 'Friendly Party Rental NYC order ' + order.orderNumber + ' - additional charge',
      metadata: buildNycPaymentMetadata({
        orderId: order.id,
        orderNumber: order.orderNumber,
        kind: 'saved_card',
        principalCents: amountCents,
        tipCents: 0,
        extra: { reason: reason.slice(0, 400), chargedBy: session.user?.name || 'unknown' },
      }),
    }, { idempotencyKey })

    if (intent.status === 'processing') {
      return NextResponse.json({ pending: true, stripePaymentId: intent.id, message: 'Charge is processing. It will be recorded automatically when Stripe confirms it.' }, { status: 202 })
    }
    if (intent.status !== 'succeeded') {
      return NextResponse.json({ error: 'The card could not be charged without the customer (status: ' + intent.status + '). Send the customer a payment link instead.', stripePaymentId: intent.id }, { status: 402 })
    }

    await recordSucceededIntent(intent, {
      notes: `Card on file charged - ${reason}`,
      recordedByName: session.user?.name || null,
    })

    return NextResponse.json({ success: true, stripePaymentId: intent.id })
  } catch (err: any) {
    if (isNycPaymentsUnavailable(err)) {
      console.error('[charge-saved-card] Blocked:', err.reason)
      return NextResponse.json({ error: 'Card charges are disabled until NYC Stripe is fully configured and online payments are enabled.' }, { status: 503 })
    }
    console.error('[charge-saved-card] Charge failed:', describeStripeError(err))
    const message = err?.type === 'StripeCardError' ? (err?.message || 'The card was declined') : 'Failed to charge saved card'
    return NextResponse.json({ error: message }, { status: err?.type === 'StripeCardError' ? 402 : 400 })
  }
}
