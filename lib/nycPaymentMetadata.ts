// Server-generated Stripe metadata for NYC payments, and the checks applied when
// a PaymentIntent is later confirmed, synced, or delivered by webhook.
//
// Pure module: no SDK/database imports (unit tested in tests/nyc-stripe-safeguards.test.cjs).
// Metadata is always produced on the server from the order record. Nothing the
// browser sends is copied into it.

export const NYC_LOCATION = 'nyc'
export const NYC_PAYMENT_APP = 'fpr-nyc'

export type NycPaymentKind = 'checkout' | 'balance' | 'staff_card' | 'saved_card' | 'autopay'

const PAYMENT_KINDS: NycPaymentKind[] = ['checkout', 'balance', 'staff_card', 'saved_card', 'autopay']

export interface NycPaymentMetadataInput {
  orderId: string
  orderNumber: string
  kind: NycPaymentKind
  /** Portion of the charge applied to the order balance, in cents. */
  principalCents: number
  /** Additional tip added on top of the order total at payment time, in cents. */
  tipCents: number
  extra?: Record<string, string | null | undefined>
}

function assertNonNegativeCents(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(label + ' must be a non-negative whole number of cents')
}

export function buildNycPaymentMetadata(input: NycPaymentMetadataInput): Record<string, string> {
  if (typeof input.orderId !== 'string' || !input.orderId) throw new Error('orderId is required for NYC payment metadata')
  if (typeof input.orderNumber !== 'string' || !input.orderNumber) throw new Error('orderNumber is required for NYC payment metadata')
  if (!PAYMENT_KINDS.includes(input.kind)) throw new Error('Unknown NYC payment kind')
  assertNonNegativeCents(input.principalCents, 'principalCents')
  assertNonNegativeCents(input.tipCents, 'tipCents')
  const metadata: Record<string, string> = {}
  // Extra keys go first so they can never override the protected fields below.
  for (const [key, value] of Object.entries(input.extra || {})) {
    if (typeof value !== 'string' || !value) continue
    if (!/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(key)) continue
    metadata[key] = value.slice(0, 450)
  }
  metadata.location = NYC_LOCATION
  metadata.app = NYC_PAYMENT_APP
  metadata.orderId = input.orderId
  metadata.orderNumber = input.orderNumber
  metadata.paymentKind = input.kind
  metadata.principalCents = String(input.principalCents)
  metadata.tipCents = String(input.tipCents)
  return metadata
}

export type NycMetadataCheck =
  | { ok: true; orderId: string; orderNumber: string; tipCents: number; principalCents: number | null; kind: string }
  | { ok: false; reason: string }

function readCents(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{1,9}$/.test(value)) return null
  return Number(value)
}

/**
 * Validates that a PaymentIntent (or refund) belongs to this NYC order.
 * Pass `order = null` to validate only the location tag (e.g. before the order is loaded).
 */
export function checkNycPaymentMetadata(
  metadata: Record<string, string> | null | undefined,
  order: { id: string; orderNumber: string } | null,
): NycMetadataCheck {
  if (!metadata || typeof metadata !== 'object') return { ok: false, reason: 'metadata_missing' }
  if (metadata.location !== NYC_LOCATION) return { ok: false, reason: 'location_not_nyc' }
  const orderId = metadata.orderId
  const orderNumber = metadata.orderNumber
  if (typeof orderId !== 'string' || !orderId) return { ok: false, reason: 'order_id_missing' }
  if (typeof orderNumber !== 'string' || !orderNumber) return { ok: false, reason: 'order_number_missing' }
  if (order) {
    if (order.id !== orderId) return { ok: false, reason: 'order_id_mismatch' }
    if (order.orderNumber !== orderNumber) return { ok: false, reason: 'order_number_mismatch' }
  }
  const tipCents = metadata.tipCents === undefined ? 0 : readCents(metadata.tipCents)
  if (tipCents === null) return { ok: false, reason: 'tip_invalid' }
  const principalCents = metadata.principalCents === undefined ? null : readCents(metadata.principalCents)
  if (metadata.principalCents !== undefined && principalCents === null) return { ok: false, reason: 'principal_invalid' }
  return { ok: true, orderId, orderNumber, tipCents, principalCents, kind: typeof metadata.paymentKind === 'string' ? metadata.paymentKind : 'unknown' }
}

/** Amount in dollars -> integer cents, rejecting NaN/Infinity and sub-cent noise. */
export function dollarsToCents(amount: unknown): number {
  const value = typeof amount === 'string' ? Number(amount) : amount
  if (typeof value !== 'number' || !Number.isFinite(value)) return NaN
  return Math.round(value * 100)
}

export function centsToDollars(cents: number): number {
  return Math.round(cents) / 100
}

/**
 * Stable Stripe idempotency key. Two identical requests (double-click, browser retry,
 * concurrent cron runs) resolve to the same Stripe object instead of charging twice.
 */
export function nycIdempotencyKey(parts: Array<string | number>): string {
  const body = parts.map(part => String(part).replace(/[^A-Za-z0-9_.:-]/g, '')).join(':')
  return ('fpr-nyc:' + body).slice(0, 250)
}
