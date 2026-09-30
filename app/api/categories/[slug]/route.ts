export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PUBLIC_ITEM_SELECT } from '@/lib/availability'
import { categoryDescriptionForNyc, itemDescriptionForNyc } from '@/lib/nycPublicCopy'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const category = await prisma.category.findFirst({
    where: { slug: (await params).slug, displayToCustomer: true },
    include: {
      items: {
        where: { displayToCustomer: true },
        select: PUBLIC_ITEM_SELECT,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      },
    },
  })

  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  return NextResponse.json({
    category: {
      ...category,
      description: categoryDescriptionForNyc(category.name, category.description),
      items: category.items.map((item) => ({
        ...item,
        description: itemDescriptionForNyc(item.name, item.description, Number(item.cost)),
      })),
    },
  }, { headers: { 'Cache-Control': 'private, no-store' } })
}
