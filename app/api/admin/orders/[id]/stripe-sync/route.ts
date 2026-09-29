export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { describeStripeError, isNycPaymentsUnavailable, requireNycStripe } from "@/lib/stripe"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { checkNycPaymentMetadata } from "@/lib/nycPaymentMetadata"
import { PaymentAssociationError, reconcileNycRefunds, recordSucceededIntent } from "@/lib/nycStripeReconcile"

// Reconciles this order's payment records against the NYC Stripe account.
// Relying only on the browser's confirm-payment call (or a webhook) is fragile: if
// the tab closes right after Stripe charges the card, the charge is real but
// invisible to us. This finds every NYC PaymentIntent tagged with this order,
// records succeeded ones that were never recorded (idempotently), and brings
// refunds up to date. Only PaymentIntents whose server metadata matches this
// exact order (location=nyc, order id and order number) are ever recorded.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) return NextResponse.json({ error: "Order not found" }, { status: 404 })
    const order = await prisma.order.findUnique({ where: { id }, include: { payments: true } })
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const stripe = await requireNycStripe('reconcile')
    const recordedIds = new Set(order.payments.map((p) => p.stripePaymentId).filter(Boolean))
    const search = await stripe.paymentIntents.search({ query: "metadata['orderId']:'" + id + "'", limit: 100 })

    const found = search.data.map((intent) => ({
      id: intent.id,
      status: intent.status,
      amount: intent.amount / 100,
      created: new Date(intent.created * 1000).toISOString(),
      alreadyRecorded: recordedIds.has(intent.id),
      matchesOrder: checkNycPaymentMetadata(intent.metadata, order).ok,
    }))

    const recovered: { id: string; amount: number }[] = []
    const skipped: { id: string; reason: string }[] = []
    for (const intent of search.data) {
      const check = checkNycPaymentMetadata(intent.metadata, order)
      if (!check.ok) { skipped.push({ id: intent.id, reason: check.reason }); continue }
      if (intent.status !== "succeeded") continue
      try {
        if (!recordedIds.has(intent.id)) {
          await recordSucceededIntent(intent, {
            notes: "Recovered via Stripe sync - this charge succeeded on Stripe but was never recorded by the app (missed webhook/confirmation)",
            recordedByName: session.user?.name || null,
          })
          recovered.push({ id: intent.id, amount: intent.amount_received / 100 })
        }
        await reconcileNycRefunds(stripe, intent.id)
      } catch (error) {
        if (!(error instanceof PaymentAssociationError)) throw error
        skipped.push({ id: intent.id, reason: error.reason })
      }
    }

    return NextResponse.json({ success: true, found, recovered, skipped })
  } catch (error) {
    if (isNycPaymentsUnavailable(error)) {
      return NextResponse.json({ error: "NYC Stripe is not fully configured: " + error.reason }, { status: 503 })
    }
    console.error("Stripe sync error:", describeStripeError(error))
    return NextResponse.json({ error: "Sync failed" }, { status: 500 })
  }
}
