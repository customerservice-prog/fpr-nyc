export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

  return NextResponse.json({ category })
}
