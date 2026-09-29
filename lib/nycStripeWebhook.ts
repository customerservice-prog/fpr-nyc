import type Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { requireNycStripe } from '@/lib/stripe'
import {
  PaymentAssociationError,
  alertOwner,
  reconcileNycRefunds,
  recordCanceledIntent,
  recordFailedIntent,
  recordProcessingIntent,
  recordSucceededIntent,
  type ReconcileOutcome,
} from '@/lib/nycStripeReconcile'
import { checkNycPaymentMetadata } from '@/lib/nycPaymentMetadata'
import { decideWebhookClaim, NYC_HANDLED_STRIPE_EVENTS, type WebhookLedgerRow } from '@/lib/nycWebhookLedger'

export { NYC_HANDLED_STRIPE_EVENTS }

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}

/** Inserts or re-claims the ledger row for this event. */
export async function claimWebhookEvent(event: Stripe.Event): Promise<'process' | 'duplicate' | 'in_progress'> {
  try {
    await prisma.stripeWebhookEvent.create({
      data: { id: event.id, type: event.type, livemode: event.livemode, status: 'processing', attempts: 1 },
    })
    return 'process'
  } catch (error) {
    if ((error as { code?: string })?.code !== 'P2002') throw error
  }
  const existing = await prisma.stripeWebhookEvent.findUnique({ where: { id: event.id } })
  if (!existing) return 'in_progress'
  const decision = decideWebhookClaim(existing as WebhookLedgerRow, Date.now())
  if (decision !== 'process') return decision
  // Re-claim a failed (or stale "processing") row atomically so two retries never run together.
  const claimed = await prisma.stripeWebhookEvent.updateMany({
    where: { id: event.id, status: existing.status, updatedAt: existing.updatedAt },
    data: { status: 'processing', attempts: { increment: 1 } },
  })
  return claimed.count === 1 ? 'process' : 'in_progress'
}

export async function finishWebhookEvent(eventId: string, outcome: ReconcileOutcome): Promise<void> {
  await prisma.stripeWebhookEvent.update({
    where: { id: eventId },
    data: {
      status: outcome.status,
      processedAt: new Date(),
      lastError: null,
      note: outcome.note ? outcome.note.slice(0, 500) : null,
      orderId: outcome.orderId || null,
      paymentIntentId: outcome.paymentIntentId || null,
    },
  })
}

export async function failWebhookEvent(eventId: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.name + ': ' + error.message : String(error)
  try {
    await prisma.stripeWebhookEvent.update({ where: { id: eventId }, data: { status: 'failed', lastError: message.slice(0, 1000) } })
  } catch (ledgerError) {
    console.error('[stripe-webhook] Could not mark event as failed:', eventId, ledgerError)
  }
}

export async function recordIgnoredEvent(event: Stripe.Event, note: string): Promise<void> {
  await prisma.stripeWebhookEvent.upsert({
    where: { id: event.id },
    create: { id: event.id, type: event.type, livemode: event.livemode, status: 'ignored', note, processedAt: new Date() },
    update: { status: 'ignored', note, processedAt: new Date() },
  })
}

async function rejected(intent: { id: string; amount?: number; metadata?: Stripe.Metadata | null }, reason: string, eventType: string): Promise<ReconcileOutcome> {
  console.error('[stripe-webhook] Rejected', eventType, 'for', intent.id + ':', reason)
  await alertOwner('Payment could not be matched to an NYC order', [
    `Stripe event ${eventType} for ${intent.id} was rejected (${reason}).`,
    `Amount: $${((intent.amount || 0) / 100).toFixed(2)}. Order in metadata: ${intent.metadata?.orderNumber || 'none'} (${intent.metadata?.orderId || 'none'}).`,
    'No order was marked paid. Review this payment in the NYC Stripe account and refund or reassign it manually if needed.',
  ])
  return { status: 'rejected', paymentIntentId: intent.id, orderId: intent.metadata?.orderId || null, note: reason }
}

async function handlePaymentIntentEvent(event: Stripe.Event, stripe: Stripe): Promise<ReconcileOutcome> {
  const fromEvent = event.data.object as Stripe.PaymentIntent
  const location = checkNycPaymentMetadata(fromEvent.metadata, null)
  if (!location.ok) {
    // Not created by this app (e.g. a manual charge in the Dashboard). Never attach it to an order.
    return { status: 'ignored', paymentIntentId: fromEvent.id, note: 'not_an_nyc_order_payment:' + location.reason }
  }
  // Re-read from the NYC account: proves the object exists there and gives the current state.
  const intent = await stripe.paymentIntents.retrieve(fromEvent.id)
  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        if (intent.status !== 'succeeded') return { status: 'ignored', paymentIntentId: intent.id, orderId: location.orderId, note: 'current_status_' + intent.status }
        const updated = await recordSucceededIntent(intent, { sendReceipt: true })
        return { status: 'processed', paymentIntentId: intent.id, orderId: updated.id }
      }
      case 'payment_intent.processing': {
        const order = await recordProcessingIntent(intent)
        return { status: 'processed', paymentIntentId: intent.id, orderId: order.id }
      }
      case 'payment_intent.payment_failed': {
        const order = await recordFailedIntent(intent, event.id)
        return { status: 'processed', paymentIntentId: intent.id, orderId: order.id }
      }
      case 'payment_intent.canceled': {
        const order = await recordCanceledIntent(intent)
        return { status: 'processed', paymentIntentId: intent.id, orderId: order.id }
      }
      default:
        return { status: 'ignored', paymentIntentId: intent.id, note: 'unhandled_payment_intent_event' }
    }
  } catch (error) {
    if (error instanceof PaymentAssociationError) return rejected(intent, error.reason, event.type)
    throw error
  }
}

async function handleRefundEvent(event: Stripe.Event, stripe: Stripe): Promise<ReconcileOutcome> {
  const object = event.data.object as Stripe.Charge | Stripe.Refund
  const paymentIntentId = idOf(object.payment_intent as string | Stripe.PaymentIntent | null)
  if (!paymentIntentId) return { status: 'ignored', note: 'refund_without_payment_intent' }
  try {
    const result = await reconcileNycRefunds(stripe, paymentIntentId)
    return { status: 'processed', paymentIntentId, orderId: result.orderId, note: `refunds=${result.refunds} changed=${result.changed}` }
  } catch (error) {
    if (error instanceof PaymentAssociationError) {
      if (error.reason === 'location_not_nyc' || error.reason === 'metadata_missing') return { status: 'ignored', paymentIntentId, note: 'not_an_nyc_order_payment' }
      return rejected({ id: paymentIntentId }, error.reason, event.type)
    }
    throw error
  }
}

async function handleDispute(event: Stripe.Event, stripe: Stripe): Promise<ReconcileOutcome> {
  const dispute = event.data.object as Stripe.Dispute
  const paymentIntentId = idOf(dispute.payment_intent as string | Stripe.PaymentIntent | null)
  let orderId: string | null = null
  if (paymentIntentId) {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId)
    const check = checkNycPaymentMetadata(intent.metadata, null)
    if (check.ok) {
      const order = await prisma.order.findUnique({ where: { id: check.orderId } })
      if (order && order.orderNumber === check.orderNumber) {
        orderId = order.id
        const note = `Stripe dispute ${dispute.id} opened (${dispute.reason}) for $${(dispute.amount / 100).toFixed(2)} on ${new Date().toISOString().slice(0, 10)}.`
        if (!(order.internalNotes || '').includes(dispute.id)) {
          await prisma.order.update({ where: { id: order.id }, data: { internalNotes: (order.internalNotes ? order.internalNotes + '\n' : '') + note } })
        }
      }
    }
  }
  await alertOwner('Dispute opened', [
    `A customer opened a card dispute (${dispute.id}, reason: ${dispute.reason}) for $${(dispute.amount / 100).toFixed(2)}.`,
    orderId ? `Order ID: ${orderId}.` : 'The dispute could not be matched to an NYC order automatically.',
    'Respond to the dispute in the NYC Stripe Dashboard before the evidence deadline.',
  ])
  return { status: 'processed', paymentIntentId, orderId, note: 'dispute_recorded' }
}

/** Processes one verified NYC webhook event. Throws on transient failures so Stripe retries. */
export async function processNycStripeEvent(event: Stripe.Event): Promise<ReconcileOutcome> {
  if (!NYC_HANDLED_STRIPE_EVENTS.includes(event.type)) return { status: 'ignored', note: 'unhandled_event_type' }
  const stripe = await requireNycStripe('webhook')
  if (event.type.startsWith('payment_intent.')) return handlePaymentIntentEvent(event, stripe)
  if (event.type === 'charge.dispute.created') return handleDispute(event, stripe)
  return handleRefundEvent(event, stripe)
}
