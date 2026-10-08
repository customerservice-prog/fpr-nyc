export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { describeStripeError, isNycPaymentsUnavailable, requireNycStripe } from '@/lib/stripe'
import { buildPaymentReceipt } from '@/lib/paymentReceipt'
import { PaymentAssociationError, loadOrderForIntent, recordSucceededIntent } from '@/lib/nycStripeReconcile'
import { createPublicOrderAccessToken, hasPublicOrderAccess } from '@/lib/publicOrderAccess'
import { ASSISTANT_ORDER_COOKIE, ASSISTANT_SESSION_TTL_SECONDS, createAssistantOrderSession } from '@/lib/customerAssistantSecurity'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasStaffPermission } from '@/lib/staffPermissions'

// Records a customer's payment only after the server re-reads the PaymentIntent
// from the NYC Stripe account and confirms it succeeded for THIS order. Reaching a
// confirmation page never marks an order paid by itself, and there is no simulated
// payment path. Amount, tip, and saved-card details come from Stripe/metadata,
// never from the browser.

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const stripePaymentId = typeof body?.stripePaymentId === 'string' ? body.stripePaymentId.trim() : ''
    const accessToken = typeof body?.accessToken === 'string' ? body.accessToken : null
    if (!/^pi_[A-Za-z0-9]+$/.test(stripePaymentId)) {
      return NextResponse.json({ error: 'Payment could not be verified' }, { status: 400 })
    }

    const order = await prisma.order.findUnique({ where: { id } })
    if (!order) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    let authorized = order.status === 'incomplete' || hasPublicOrderAccess(request, id, accessToken)
    if (!authorized) {
      const session = await getServerSession(authOptions).catch(() => null)
      authorized = hasStaffPermission((session?.user as { role?: string } | undefined)?.role, 'payments')
    }
    if (!authorized) {
      return NextResponse.json({ error: 'Secure order verification is required.' }, { status: 401 })
    }

    const stripe = await requireNycStripe('reconcile')
    const intent = await stripe.paymentIntents.retrieve(stripePaymentId)
    const { order: linkedOrder } = await loadOrderForIntent(intent)
    if (linkedOrder.id !== order.id) {
      return NextResponse.json({ error: 'Payment does not match this order' }, { status: 400 })
    }

    if (intent.status === 'processing') {
      return NextResponse.json({ pending: true, message: 'Your payment is processing. We will email your receipt as soon as it completes.' }, { status: 202 })
    }
    if (intent.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment has not completed yet' }, { status: 409 })
    }

    const updated = await recordSucceededIntent(intent, { sendReceipt: body?.sendReceipt !== false })
    const receipt = buildPaymentReceipt(intent, updated as any)
    const orderAccessToken = createPublicOrderAccessToken(updated.id, updated.eventDate)
    const response = NextResponse.json({ success: true, order: updated, receipt, orderAccessToken })

    // A verified successful payment is strong proof for this exact order/customer.
    const assistantSession = createAssistantOrderSession(updated.id, updated.customerId)
    if (assistantSession) {
      response.cookies.set({
        name: ASSISTANT_ORDER_COOKIE,
        value: assistantSession,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: ASSISTANT_SESSION_TTL_SECONDS,
      })
    }
    return response
  } catch (error) {
    if (error instanceof PaymentAssociationError) {
      console.error('[confirm-payment] Payment/order mismatch:', error.reason)
      return NextResponse.json({ error: 'Payment does not match this order' }, { status: 400 })
    }
    if (isNycPaymentsUnavailable(error)) {
      console.error('[confirm-payment] Stripe unavailable:', error.reason)
      return NextResponse.json({ error: 'Payment verification is temporarily unavailable. Please contact us before paying again.' }, { status: 503 })
    }
    if ((error as { code?: string })?.code === 'resource_missing') {
      return NextResponse.json({ error: 'Payment could not be verified' }, { status: 400 })
    }
    console.error('[confirm-payment] Failed to record payment:', describeStripeError(error))
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
  }
}
