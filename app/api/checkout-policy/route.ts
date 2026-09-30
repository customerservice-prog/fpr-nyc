export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { publicCheckoutPolicy } from '@/lib/nycCheckoutPolicy'
import { getNycCheckoutPolicy } from '@/lib/nycCheckoutPricingServer'

// Owner-approved minimum order and optional fees, so the storefront only offers
// options the server will price. `configured: false` means online checkout is
// blocked until the policy is approved and set.
export async function GET() {
  return NextResponse.json(publicCheckoutPolicy(getNycCheckoutPolicy()), { headers: { 'Cache-Control': 'no-store' } })
}
