export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { finalizePayment } from "@/lib/payments"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// Reconciles this order's payment records against Stripe directly.
// This exists because relying only on the client-side confirm-payment
// call (or a webhook) to record a successful charge is fragile: if the
// browser tab closes or the network drops right after Stripe charges
// the card but before our server records it, the charge is real but
// invisible to us. This endpoint finds any Stripe PaymentIntent tied
// to this order that succeeded but was never recorded, and finalizes it.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (!stripe) {
      return NextResponse.json({ error: "Stripe is not configured" }, { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { id: (await params).id },
      include: { payments: true },
    })
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const recordedIds = new Set(
      order.payments.map((p) => p.stripePaymentId).filter(Boolean)
    )

    const search = await stripe.paymentIntents.search({
      query: "metadata['orderId']:'" + (await params).id + "'",
      limit: 100,
    })

    const found = search.data.map((intent) => ({
      id: intent.id,
      status: intent.status,
      amount: intent.amount / 100,
      created: new Date(intent.created * 1000).toISOString(),
      alreadyRecorded: recordedIds.has(intent.id),
    }))

    const recovered: { id: string; amount: number }[] = []
    for (const intent of search.data) {
      if (intent.status === "succeeded" && !recordedIds.has(intent.id)) {
        await finalizePayment({
          orderId: (await params).id,
          amount: intent.amount / 100,
          stripePaymentId: intent.id,
          notes: "Recovered via Stripe sync - this charge succeeded on Stripe but was never recorded by the app (missed webhook/confirmation)",
        })
        recovered.push({ id: intent.id, amount: intent.amount / 100 })
      }
    }

    return NextResponse.json({ success: true, found, recovered })
  } catch (error) {
    console.error("Stripe sync error:", error)
    const message = error instanceof Error ? error.message : "Sync failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
