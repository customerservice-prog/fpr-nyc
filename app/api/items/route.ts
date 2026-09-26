export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getItemsWithAvailability, PUBLIC_ITEM_SELECT, withCategoryImage } from '@/lib/availability'
import { itemDescriptionForNyc } from '@/lib/nycPublicCopy'

function localizeItem<T extends { name: string; description?: string | null }>(item: T): T {
  return { ...item, description: itemDescriptionForNyc(item.name, item.description) }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const date = searchParams.get('date')
  const category = searchParams.get('category')
  const search = searchParams.get('search')

  if (!date) {
    const { prisma } = await import('@/lib/prisma')
    const items = await prisma.item.findMany({
      where: {
        displayToCustomer: true,
        ...(category ? { category: { slug: category } } : {}),
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      select: PUBLIC_ITEM_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json(
      { items: items.map((item) => localizeItem(withCategoryImage(item))) },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } }
    )
  }

  const items = await getItemsWithAvailability(
    new Date(date),
    category || undefined,
    search || undefined
  )

  return NextResponse.json({ items: items.map(localizeItem) })
}
