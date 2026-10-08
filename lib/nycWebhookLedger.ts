// Pure webhook-ledger decisions (unit tested in tests/nyc-stripe-safeguards.test.cjs).

/**
 * The only Stripe events the NYC webhook endpoint processes. Subscribe the NYC
 * endpoint in the Stripe Dashboard to exactly this list.
 */
export const NYC_HANDLED_STRIPE_EVENTS: string[] = [
  'payment_intent.succeeded',
  'payment_intent.processing',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
  'setup_intent.succeeded',
  'charge.refunded',
  'charge.refund.updated',
  'charge.dispute.created',
]

export interface WebhookLedgerRow {
  status: string
  updatedAt: Date
}

/** A "processing" row older than this is assumed to belong to a crashed worker and may be retried. */
export const WEBHOOK_STALE_PROCESSING_MS = 2 * 60 * 1000

/**
 * Decides what to do when an event id is already in the ledger:
 * - processed / ignored / rejected -> acknowledge as a duplicate (no side effects);
 * - processing (recent)            -> another delivery is working on it; ask Stripe to retry later;
 * - failed or stale processing     -> process again.
 */
export function decideWebhookClaim(row: WebhookLedgerRow, now: number): 'process' | 'duplicate' | 'in_progress' {
  if (row.status === 'processed' || row.status === 'ignored' || row.status === 'rejected') return 'duplicate'
  if (row.status === 'processing' && now - new Date(row.updatedAt).getTime() < WEBHOOK_STALE_PROCESSING_MS) return 'in_progress'
  return 'process'
}
