export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { DeliveryQuoteError, getDeliveryQuote } from '@/lib/delivery'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  try {
    const quote = await getDeliveryQuote(searchParams.get('zip'))
    return NextResponse.json(quote, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof DeliveryQuoteError
      ? error.message
      : 'Delivery pricing is temporarily unavailable. Please retry before paying.'
    const status = error instanceof DeliveryQuoteError ? error.status : 503
    return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } })
  }
}
