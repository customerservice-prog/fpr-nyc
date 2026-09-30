export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getActiveTaxRatePercent } from '@/lib/nycCheckoutPricingServer'
import { NYC_SALES_TAX_SOURCE, resolveNycSalesTax, salesTaxUnavailableMessage } from '@/lib/nycSalesTax'
import { BUSINESS } from '@/lib/utils'

// With ?zip=, returns the sales-tax rate for that NYC delivery ZIP (lib/nycSalesTax.ts),
// or `rate: null` with the reason when the ZIP is unknown or crosses a municipal line.
// Without a ZIP, returns the staff default from Admin > Settings > Tax Rate (used only
// for staff-created orders), or `rate: null` when none is saved. There is no fallback rate.
export async function GET(request: NextRequest) {
  const headers = { 'Cache-Control': 'no-store' }
  const zip = new URL(request.url).searchParams.get('zip')
  if (zip !== null) {
    const resolution = resolveNycSalesTax(zip)
    if (resolution.status === 'resolved') {
      return NextResponse.json({
        rate: {
          rate: resolution.ratePercent,
          isActive: true,
          zip: resolution.zip,
          jurisdiction: resolution.jurisdiction.name,
          reportingCode: resolution.jurisdiction.reportingCode,
          source: NYC_SALES_TAX_SOURCE.publication,
        },
      }, { headers })
    }
    return NextResponse.json({ rate: null, status: resolution.status, message: salesTaxUnavailableMessage(resolution, BUSINESS.phone) }, { headers })
  }
  const rate = await getActiveTaxRatePercent()
  return NextResponse.json({ rate: rate === null ? null : { rate, isActive: true } }, { headers })
}
