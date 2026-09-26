export const revalidate = 60

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { categoryDescriptionForSc, itemDescriptionForSc } from '@/lib/nycPublicCopy'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const category = await prisma.category.findUnique({
    where: { slug: (await params).slug },
    include: {
      items: {
        where: { displayToCustomer: true },
        orderBy: { name: 'asc' },
      },
    },
  })

  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  return NextResponse.json({
    category: {
      ...category,
      description: categoryDescriptionForSc(category.name, category.description),
      items: category.items.map((item) => ({
        ...item,
        description: itemDescriptionForSc(item.name, item.description),
      })),
    },
  })
}
