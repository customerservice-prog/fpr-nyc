export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { nycStripeChargesActivated, nycStripeConfigReport, requireNycStripe } from '@/lib/stripe'
import { getActiveDepositRule, getActiveTaxRatePercent } from '@/lib/nycCheckoutPricingServer'
import { NYC_PAYMENTS_UNAVAILABLE_MESSAGE } from '@/lib/nycStripeGuard'

// Public, secret-free readiness check used by the checkout and pay-link pages to
// disable the Pay button before a customer enters card details. Each check is a
// boolean only; no keys, account IDs, or configuration values are returned.
// The payment APIs enforce the same rules on every request regardless of this page.
// Delivery fees are ZIP-specific and are checked separately by /api/delivery-fee.
export async function GET() {
  const report = nycStripeConfigReport()
  const problems = report.chargeProblems
  const checks = {
    stripeKeysConfigured: !problems.some(problem => problem.startsWith('secret_key') || problem.startsWith('publishable_key')),
    nycAccountIdConfigured: !problems.some(problem => problem.startsWith('account_id')),
    webhookSecretConfigured: !problems.some(problem => problem.startsWith('webhook_secret')),
    onlinePaymentsSwitchOn: !problems.includes('online_payments_switch_off'),
    nycAccountVerified: false,
    stripeAccountActivated: false,
    taxRateConfigured: false,
    depositRuleConfigured: false,
  }
  if (report.serverProblems.length === 0) {
    try {
      await requireNycStripe('reconcile')
      checks.nycAccountVerified = true
      checks.stripeAccountActivated = nycStripeChargesActivated()
    } catch {
      // Key does not belong to NYC_STRIPE_ACCOUNT_ID, or Stripe is unreachable.
    }
  }
  try {
    const [taxRate, depositRule] = await Promise.all([getActiveTaxRatePercent(), getActiveDepositRule()])
    checks.taxRateConfigured = taxRate !== null
    checks.depositRuleConfigured = depositRule !== null
  } catch {
    // Database unavailable: report as not ready.
  }
  const onlinePaymentsAvailable = Object.values(checks).every(Boolean)
  return NextResponse.json(
    {
      onlinePaymentsAvailable,
      mode: checks.nycAccountVerified ? report.mode : null,
      message: onlinePaymentsAvailable ? null : NYC_PAYMENTS_UNAVAILABLE_MESSAGE,
      checks,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
