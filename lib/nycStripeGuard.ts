// NYC Stripe configuration guard.
//
// Pure decision logic only: no Stripe SDK, Prisma, or Next.js imports, so it can
// be unit tested in isolation (see tests/nyc-stripe-safeguards.test.cjs).
//
// Rules enforced by the server before ANY payment-related Stripe write
// (customer creation, PaymentIntent creation/confirmation, saved-card charges,
// refunds, and webhook reconciliation):
//   1. STRIPE_SECRET_KEY must be a real secret/restricted key.
//   2. NYC_STRIPE_ACCOUNT_ID must be set, and the account that owns the secret key
//      (GET /v1/account) must be exactly that account. Missing configuration or a
//      mismatch blocks the operation. This prevents Syracuse, South Carolina, or
//      RentSketch credentials from ever processing NYC payments.
// Customer-facing and staff-initiated charges additionally require:
//   3. NYC_ONLINE_PAYMENTS_ENABLED === 'true' (explicit go-live switch, default off).
//   4. A publishable key of the same mode (live/test) as the secret key.
//   5. A webhook signing secret, so every payment can be reconciled.

export type StripeMode = 'live' | 'test'

export type NycStripeProblem =
  | 'secret_key_missing'
  | 'secret_key_invalid'
  | 'account_id_missing'
  | 'account_id_invalid'
  | 'publishable_key_missing'
  | 'publishable_key_invalid'
  | 'publishable_key_mode_mismatch'
  | 'webhook_secret_missing'
  | 'webhook_secret_invalid'
  | 'online_payments_switch_off'

export interface NycStripeEnv {
  STRIPE_SECRET_KEY?: string
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  NYC_STRIPE_ACCOUNT_ID?: string
  NYC_ONLINE_PAYMENTS_ENABLED?: string
}

export interface NycStripeConfigReport {
  mode: StripeMode | null
  expectedAccountId: string | null
  /** Problems that block every Stripe API call made by this app. */
  serverProblems: NycStripeProblem[]
  /** Problems that block webhook processing (server problems + webhook secret). */
  webhookProblems: NycStripeProblem[]
  /** Problems that block new charges (customer checkout, balance, saved card, autopay). */
  chargeProblems: NycStripeProblem[]
}

export const NYC_PAYMENTS_UNAVAILABLE_MESSAGE =
  'Online payment is temporarily unavailable. Please contact Friendly Party Rental NYC at 315-884-1498 before paying.'

/** Raised whenever a payment operation must not proceed. `reason` is safe to log (never contains secrets). */
export class NycPaymentsUnavailableError extends Error {
  readonly reason: string
  readonly status: number
  constructor(reason: string, status = 503) {
    super('NYC payments unavailable: ' + reason)
    this.name = 'NycPaymentsUnavailableError'
    this.reason = reason
    this.status = status
  }
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function secretKeyMode(value: unknown): StripeMode | null {
  const match = /^(?:sk|rk)_(live|test)_[A-Za-z0-9]{20,}$/.exec(clean(value))
  return match ? (match[1] as StripeMode) : null
}

export function publishableKeyMode(value: unknown): StripeMode | null {
  const match = /^pk_(live|test)_[A-Za-z0-9]{20,}$/.exec(clean(value))
  return match ? (match[1] as StripeMode) : null
}

export function isStripeAccountId(value: unknown): boolean {
  return /^acct_[A-Za-z0-9]{8,}$/.test(clean(value))
}

export function isWebhookSigningSecret(value: unknown): boolean {
  return /^whsec_[A-Za-z0-9+/=_-]{20,}$/.test(clean(value))
}

export function onlinePaymentsSwitchOn(env: NycStripeEnv): boolean {
  return clean(env.NYC_ONLINE_PAYMENTS_ENABLED) === 'true'
}

export function inspectNycStripeConfig(env: NycStripeEnv): NycStripeConfigReport {
  const serverProblems: NycStripeProblem[] = []
  const secret = clean(env.STRIPE_SECRET_KEY)
  const mode = secretKeyMode(secret)
  if (!secret) serverProblems.push('secret_key_missing')
  else if (!mode) serverProblems.push('secret_key_invalid')

  const accountId = clean(env.NYC_STRIPE_ACCOUNT_ID)
  if (!accountId) serverProblems.push('account_id_missing')
  else if (!isStripeAccountId(accountId)) serverProblems.push('account_id_invalid')

  const webhookProblems: NycStripeProblem[] = [...serverProblems]
  const webhookSecret = clean(env.STRIPE_WEBHOOK_SECRET)
  if (!webhookSecret) webhookProblems.push('webhook_secret_missing')
  else if (!isWebhookSigningSecret(webhookSecret)) webhookProblems.push('webhook_secret_invalid')

  const chargeProblems: NycStripeProblem[] = [...webhookProblems]
  const publishable = clean(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  const publishableMode = publishableKeyMode(publishable)
  if (!publishable) chargeProblems.push('publishable_key_missing')
  else if (!publishableMode) chargeProblems.push('publishable_key_invalid')
  else if (mode && publishableMode !== mode) chargeProblems.push('publishable_key_mode_mismatch')
  if (!onlinePaymentsSwitchOn(env)) chargeProblems.push('online_payments_switch_off')

  return {
    mode,
    expectedAccountId: isStripeAccountId(accountId) ? accountId : null,
    serverProblems,
    webhookProblems,
    chargeProblems,
  }
}

export interface AccountVerification {
  secretKey: string
  accountId: string
  verifiedAt: number
}

export const ACCOUNT_VERIFICATION_TTL_MS = 10 * 60 * 1000

/** True when a cached successful verification still covers this exact key/account pair. */
export function verificationIsFresh(
  cached: AccountVerification | null,
  secretKey: string,
  expectedAccountId: string,
  now: number,
  ttlMs = ACCOUNT_VERIFICATION_TTL_MS,
): boolean {
  return !!cached
    && cached.secretKey === secretKey
    && cached.accountId === expectedAccountId
    && now - cached.verifiedAt >= 0
    && now - cached.verifiedAt < ttlMs
}

/** Compares the account that owns the secret key with NYC_STRIPE_ACCOUNT_ID. Throws on any mismatch. */
export function assertAccountMatches(actualAccountId: unknown, expectedAccountId: string): void {
  if (typeof actualAccountId !== 'string' || !isStripeAccountId(actualAccountId)) {
    throw new NycPaymentsUnavailableError('stripe_account_unverifiable')
  }
  if (actualAccountId !== expectedAccountId) {
    throw new NycPaymentsUnavailableError('stripe_account_mismatch')
  }
}

/** Livemode flags on Stripe objects/events must agree with the configured key mode. */
export function livemodeMatches(livemode: unknown, mode: StripeMode | null): boolean {
  if (!mode || typeof livemode !== 'boolean') return false
  return livemode === (mode === 'live')
}
