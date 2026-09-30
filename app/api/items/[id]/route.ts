export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getItemAvailability, PUBLIC_ITEM_SELECT } from '@/lib/availability'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Public endpoint: only published items in published categories, and only the
  // public fields (never internal notes, SKUs or hidden catalog items).
  const item = await prisma.item.findFirst({
    where: { id: (await params).id, displayToCustomer: true, category: { displayToCustomer: true } },
    select: PUBLIC_ITEM_SELECT,
  })

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  const url = new URL(request.url)
  const date = url.searchParams.get('date')
  let available = item.quantity

  if (date) {
    available = await getItemAvailability(item.id, new Date(date))
  }

  return NextResponse.json({ item: { ...item, available } })
}
