export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getItemAvailability } from '@/lib/availability'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const date = searchParams.get('date')
  const itemId = searchParams.get('itemId')

  if (!date || !itemId) {
    return NextResponse.json({ error: 'date and itemId required' }, { status: 400 })
  }

  const available = await getItemAvailability(itemId, new Date(date))
  return NextResponse.json({ available })
}
