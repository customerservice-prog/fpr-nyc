export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { DeliveryQuoteError, requireDeliveryMethod } from '@/lib/delivery'
import { CheckoutPricingError } from '@/lib/nycCheckoutPricing'
import { priceNycCheckout } from '@/lib/nycCheckoutPricingServer'

// Read-only price quote for the payment page. It runs the exact server pricing the
// order API uses, so the customer is shown the server's own numbers. Nothing is
// written: no customer, order, inventory hold, email, or Stripe call.
export async function POST(request: NextRequest) {
  const headers = { 'Cache-Control': 'no-store' }
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid checkout details.', code: 'invalid_request' }, { status: 400, headers })
    }
    requireDeliveryMethod(body.deliveryType)
    const pricing = await priceNycCheckout(body)
    return NextResponse.json({ pricing }, { headers })
  } catch (error) {
    if (error instanceof CheckoutPricingError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status, headers })
    }
    if (error instanceof DeliveryQuoteError) {
      return NextResponse.json({ error: error.message, code: 'delivery_quote' }, { status: error.status, headers })
    }
    console.error('Checkout quote error:', error instanceof Error ? error.name : 'unknown')
    return NextResponse.json({ error: 'Pricing is temporarily unavailable. Please retry.', code: 'pricing_unavailable' }, { status: 503, headers })
  }
}
