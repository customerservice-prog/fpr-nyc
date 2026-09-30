import Stripe from 'stripe'
import {
  NycPaymentsUnavailableError,
  assertAccountMatches,
  inspectNycStripeConfig,
  verificationIsFresh,
  type AccountVerification,
  type NycStripeConfigReport,
  type StripeMode,
} from '@/lib/nycStripeGuard'

// All NYC Stripe access goes through requireNycStripe(). There is deliberately no
// exported raw client: every payment-related write must first prove that the
// configured secret key belongs to NYC_STRIPE_ACCOUNT_ID.

export const NYC_STRIPE_API_VERSION = '2023-10-16' as const

/**
 * What the caller is about to do:
 * - 'charge'    create customers / PaymentIntents / saved-card or autopay charges.
 *               Requires the NYC_ONLINE_PAYMENTS_ENABLED switch, publishable key, and webhook secret.
 * - 'refund'    refund an existing NYC payment (requires webhook secret for reconciliation).
 * - 'reconcile' verify/record payments that already happened (confirmation page, staff sync).
 * - 'webhook'   process a signed webhook event.
 */
export type NycStripePurpose = 'charge' | 'refund' | 'reconcile' | 'webhook'

let cachedClient: { key: string; client: Stripe } | null = null
let lastVerification: AccountVerification | null = null
// Whether Stripe has activated live charges on the verified account.
let lastChargesEnabled = false
// Recent verification failure, so a public page cannot trigger repeated Stripe calls.
let lastFailure: { secretKey: string; accountId: string; reason: string; at: number } | null = null
const FAILURE_RETRY_MS = 60 * 1000

function secretKey(): string {
  return (process.env.STRIPE_SECRET_KEY || '').trim()
}

function clientForKey(key: string): Stripe {
  if (cachedClient && cachedClient.key === key) return cachedClient.client
  const client = new Stripe(key, {
    apiVersion: NYC_STRIPE_API_VERSION,
    maxNetworkRetries: 2,
    timeout: 20000,
    appInfo: { name: 'friendly-party-rental-nyc' },
  })
  cachedClient = { key, client }
  return client
}

export function nycStripeConfigReport(): NycStripeConfigReport {
  // Explicit property reads: Next.js inlines NEXT_PUBLIC_* at build time, so this
  // reflects the exact publishable key shipped to the browser.
  return inspectNycStripeConfig({
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    NYC_STRIPE_ACCOUNT_ID: process.env.NYC_STRIPE_ACCOUNT_ID,
    NYC_ONLINE_PAYMENTS_ENABLED: process.env.NYC_ONLINE_PAYMENTS_ENABLED,
  })
}

export function nycStripeMode(): StripeMode | null {
  return nycStripeConfigReport().mode
}

/** Safe, secret-free summary of a Stripe/SDK error for logs. */
export function describeStripeError(error: unknown): string {
  if (!error || typeof error !== 'object') return String(error)
  const err = error as { type?: string; code?: string; statusCode?: number; requestId?: string; message?: string }
  return [err.type, err.code, err.statusCode, err.requestId].filter(Boolean).join(' ') || 'unknown_error'
}

export function isNycPaymentsUnavailable(error: unknown): error is NycPaymentsUnavailableError {
  return error instanceof NycPaymentsUnavailableError
}

function problemsFor(report: NycStripeConfigReport, purpose: NycStripePurpose) {
  if (purpose === 'charge') return report.chargeProblems
  if (purpose === 'refund' || purpose === 'webhook') return report.webhookProblems
  return report.serverProblems
}

/**
 * Returns the Stripe client only after verifying that:
 *   - the configuration required for `purpose` is present, and
 *   - the account that owns STRIPE_SECRET_KEY is exactly NYC_STRIPE_ACCOUNT_ID.
 * Missing configuration or an account mismatch throws NycPaymentsUnavailableError,
 * which callers turn into a 503 so nothing is written to Stripe or the database.
 */
export async function requireNycStripe(purpose: NycStripePurpose): Promise<Stripe> {
  const report = nycStripeConfigReport()
  const problems = problemsFor(report, purpose)
  if (problems.length) throw new NycPaymentsUnavailableError(problems.join(','))

  const key = secretKey()
  const expectedAccountId = report.expectedAccountId as string
  const client = clientForKey(key)
  const now = Date.now()
  if (verificationIsFresh(lastVerification, key, expectedAccountId, now)) return assertCanCharge(client, purpose, report)
  if (lastFailure && lastFailure.secretKey === key && lastFailure.accountId === expectedAccountId && now - lastFailure.at < FAILURE_RETRY_MS) {
    throw new NycPaymentsUnavailableError(lastFailure.reason)
  }

  let account: Stripe.Account
  try {
    account = await client.accounts.retrieve()
  } catch (error) {
    lastVerification = null
    lastFailure = { secretKey: key, accountId: expectedAccountId, reason: 'stripe_account_unverifiable', at: now }
    console.error('[nyc-stripe-guard] Could not verify the Stripe account before', purpose + ':', describeStripeError(error))
    throw new NycPaymentsUnavailableError('stripe_account_unverifiable')
  }
  try {
    assertAccountMatches(account?.id, expectedAccountId)
  } catch (error) {
    lastVerification = null
    lastFailure = { secretKey: key, accountId: expectedAccountId, reason: 'stripe_account_mismatch', at: now }
    console.error('[nyc-stripe-guard] BLOCKED', purpose + ': STRIPE_SECRET_KEY belongs to', account?.id || 'an unknown account', 'but NYC_STRIPE_ACCOUNT_ID is', expectedAccountId)
    throw error
  }
  lastFailure = null
  lastChargesEnabled = account.charges_enabled === true
  lastVerification = { secretKey: key, accountId: expectedAccountId, verifiedAt: now }
  return assertCanCharge(client, purpose, report)
}

/** After a successful requireNycStripe(): whether this key may take charges (live accounts must be activated). */
export function nycStripeChargesActivated(): boolean {
  return nycStripeConfigReport().mode === 'test' || lastChargesEnabled
}

// Live customer charges also require Stripe to have finished verifying the NYC
// account (charges_enabled). Test mode is usable before activation for staging tests.
function assertCanCharge(client: Stripe, purpose: NycStripePurpose, report: NycStripeConfigReport): Stripe {
  if (purpose === 'charge' && report.mode === 'live' && !lastChargesEnabled) {
    throw new NycPaymentsUnavailableError('stripe_account_not_activated')
  }
  return client
}

/**
 * Verifies a Stripe webhook signature against the exact raw request body using this
 * endpoint's own signing secret (STRIPE_WEBHOOK_SECRET). Throws on any problem.
 */
export function constructNycWebhookEvent(rawBody: string, signature: string | null): Stripe.Event {
  const report = nycStripeConfigReport()
  if (report.webhookProblems.length) throw new NycPaymentsUnavailableError(report.webhookProblems.join(','))
  if (!signature) throw new Error('Missing Stripe-Signature header')
  const secret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim()
  return clientForKey(secretKey()).webhooks.constructEvent(rawBody, signature, secret, 300)
}
