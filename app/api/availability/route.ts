export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getItemAvailability } from '@/lib/availability'
import { isNycPublicBookingDateOpen, NYC_PUBLIC_BOOKING_MESSAGE } from '@/lib/nycBookingWindow'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const date = searchParams.get('date')
  const itemId = searchParams.get('itemId')

  if (!date || !itemId) {
    return NextResponse.json({ error: 'date and itemId required' }, { status: 400 })
  }
  if (!isNycPublicBookingDateOpen(date)) {
    return NextResponse.json({ error: NYC_PUBLIC_BOOKING_MESSAGE, code: 'nyc_2027_booking_only' }, { status: 409 })
  }

  const available = await getItemAvailability(itemId, new Date(date))
  return NextResponse.json({ available })
}
