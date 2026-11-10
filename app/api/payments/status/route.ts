export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { nycStripeChargesActivated, nycStripeConfigReport, requireNycStripe } from '@/lib/stripe'
import { getActiveDepositRule, getNycCheckoutPolicy } from '@/lib/nycCheckoutPricingServer'
import { NYC_PAYMENTS_UNAVAILABLE_MESSAGE } from '@/lib/nycStripeGuard'
import { NYC_SERVICE_AREAS } from '@/lib/nycServiceAreas'
import { resolveNycSalesTax } from '@/lib/nycSalesTax'
import { configuredDeliveryFeeZips } from '@/lib/delivery'
import { prisma } from '@/lib/prisma'

// Public, secret-free readiness check used by the checkout and pay-link pages to
// disable the Pay button before a customer enters card details. Each check is a
// boolean only; no keys, account IDs, or configuration values are returned.
// The payment APIs enforce the same rules on every request regardless of this page.
// Delivery fees and sales tax are ZIP-specific: these checks only confirm that at
// least one approved ZIP can be priced; /api/checkout/quote prices a specific ZIP.
export async function GET() {
  const report = nycStripeConfigReport()
  const problems = report.chargeProblems
  const approvedZips = Array.from(new Set(NYC_SERVICE_AREAS.flatMap(area => area.zips)))
  const feeZips = new Set(configuredDeliveryFeeZips())
  const checks = {
    stripeKeysConfigured: !problems.some(problem => problem.startsWith('secret_key') || problem.startsWith('publishable_key')),
    nycAccountIdConfigured: !problems.some(problem => problem.startsWith('account_id')),
    webhookSecretConfigured: !problems.some(problem => problem.startsWith('webhook_secret')),
    onlinePaymentsSwitchOn: !problems.includes('online_payments_switch_off'),
    nycAccountVerified: false,
    stripeAccountActivated: false,
    // Every approved delivery ZIP has a sales-tax jurisdiction (resolved, or held for address review).
    taxRateConfigured: approvedZips.every(zip => resolveNycSalesTax(zip).status !== 'unknown_zip'),
    depositRuleConfigured: false,
    checkoutPolicyConfigured: getNycCheckoutPolicy().policy !== null,
    deliveryFeesConfigured: approvedZips.some(zip => feeZips.has(zip) && resolveNycSalesTax(zip).status === 'resolved'),
    // No paid NYC checkout when the entire catalog lacks physical confirmation.
    // This does not assert that all products, crews, or event dates are ready.
    atLeastOneNycProductVerified: false,
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
    checks.depositRuleConfigured = (await getActiveDepositRule()) !== null
  } catch {
    // Database unavailable: report as not ready.
  }
  try {
    const [publicItems, verified] = await Promise.all([
      prisma.item.findMany({
        where: { displayToCustomer: true, status: 'Available' },
        select: { slug: true },
      }),
      prisma.nycPhysicalStockVerification.findMany({
        where: {
          status: 'confirmed',
          source: { in: ['nyc_stock', 'partner_committed'] },
          verifiedQuantity: { gt: 0 },
          verifiedAt: { not: null },
        },
        select: { itemSlug: true },
      }),
    ])
    const publicSlugs = new Set(publicItems.map(item => item.slug))
    checks.atLeastOneNycProductVerified = verified.some(record => publicSlugs.has(record.itemSlug))
  } catch {
    // If stock records are unavailable, never present new bookings as ready.
  }
  // Stripe side only: enough to pay the balance of an existing order (pay links).
  const onlinePaymentsAvailable = checks.stripeKeysConfigured && checks.nycAccountIdConfigured && checks.webhookSecretConfigured
    && checks.onlinePaymentsSwitchOn && checks.nycAccountVerified && checks.stripeAccountActivated
  // New online orders additionally need approved pricing: tax table, deposit, checkout policy, delivery fees.
  const onlineCheckoutAvailable = Object.values(checks).every(Boolean)
  return NextResponse.json(
    {
      onlinePaymentsAvailable,
      onlineCheckoutAvailable,
      mode: checks.nycAccountVerified ? report.mode : null,
      message: onlinePaymentsAvailable ? null : NYC_PAYMENTS_UNAVAILABLE_MESSAGE,
      checks,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
