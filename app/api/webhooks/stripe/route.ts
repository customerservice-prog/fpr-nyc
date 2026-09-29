export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { constructNycWebhookEvent, describeStripeError, isNycPaymentsUnavailable, nycStripeMode } from '@/lib/stripe'
import { livemodeMatches } from '@/lib/nycStripeGuard'
import { claimWebhookEvent, failWebhookEvent, finishWebhookEvent, processNycStripeEvent, recordIgnoredEvent } from '@/lib/nycStripeWebhook'

// NYC Stripe webhook endpoint: https://nyc.friendlypartyrental.com/api/webhooks/stripe
//
// - The signature is verified against the exact raw request body with this
//   endpoint's own signing secret (STRIPE_WEBHOOK_SECRET) before anything else.
// - Every event id is recorded in StripeWebhookEvent: duplicate deliveries are
//   acknowledged without side effects, concurrent deliveries are serialized.
// - If processing fails (database/network), the event is marked failed and a 500
//   is returned so Stripe retries it; the payment is never silently dropped.
// - Payment/order associations are validated against server-generated metadata
//   and the PaymentIntent is re-read from the NYC account before recording.

export async function POST(request: NextRequest) {
  // Read the raw body first. It must not be parsed or re-serialized before verification.
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')

  let event: Stripe.Event
  try {
    event = constructNycWebhookEvent(rawBody, signature)
  } catch (error) {
    if (isNycPaymentsUnavailable(error)) {
      console.error('[stripe-webhook] Endpoint not configured:', error.reason)
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
    }
    console.error('[stripe-webhook] Signature verification failed:', describeStripeError(error))
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (!livemodeMatches(event.livemode, nycStripeMode())) {
    // e.g. a test-mode event delivered to the live endpoint. Recorded, never applied.
    try { await recordIgnoredEvent(event, 'livemode_mismatch') } catch (error) { console.error('[stripe-webhook] ledger error:', error) }
    return NextResponse.json({ received: true, ignored: 'livemode_mismatch' })
  }

  let claim: 'process' | 'duplicate' | 'in_progress'
  try {
    claim = await claimWebhookEvent(event)
  } catch (error) {
    console.error('[stripe-webhook] Could not record event', event.id, error)
    return NextResponse.json({ error: 'Temporarily unavailable' }, { status: 500 })
  }
  if (claim === 'duplicate') return NextResponse.json({ received: true, duplicate: true })
  if (claim === 'in_progress') return NextResponse.json({ error: 'Event is already being processed' }, { status: 409 })

  try {
    const outcome = await processNycStripeEvent(event)
    await finishWebhookEvent(event.id, outcome)
    return NextResponse.json({ received: true, status: outcome.status })
  } catch (error) {
    console.error('[stripe-webhook] Processing failed for', event.type, event.id + ':', isNycPaymentsUnavailable(error) ? error.reason : error)
    await failWebhookEvent(event.id, error)
    return NextResponse.json({ error: 'Processing failed; Stripe will retry' }, { status: 500 })
  }
}
