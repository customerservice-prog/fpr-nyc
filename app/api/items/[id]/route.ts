export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getItemAvailability } from '@/lib/availability'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const item = await prisma.item.findUnique({
    where: { id: (await params).id },
    include: { category: true },
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
