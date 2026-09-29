export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getActiveTaxRatePercent } from '@/lib/nycCheckoutPricingServer'

// Returns the configured sales-tax rate, or `rate: null` when none is configured.
// There is intentionally no fallback rate: checkout stays blocked until an approved
// rate is saved in Admin > Settings > Tax Rate.
export async function GET() {
  const rate = await getActiveTaxRatePercent()
  return NextResponse.json({ rate: rate === null ? null : { rate, isActive: true } }, { headers: { 'Cache-Control': 'no-store' } })
}
