export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { IMAGE_CACHE_BUST } from '@/lib/imageVersion'

export async function GET() {
    const rows = await prisma.category.findMany({
      where: { displayToCustomer: true },
      orderBy: { sortOrder: 'asc' },
      select: { slug: true, name: true, sortOrder: true, picture: true, updatedAt: true },
    })
  const categories = rows.map(({ picture, updatedAt, ...c }) => ({
    ...c,
    picture: picture ? `/api/category-image/${c.slug}?v=${updatedAt ? new Date(updatedAt).toISOString() : IMAGE_CACHE_BUST}` : null,
  }))
  return NextResponse.json({ categories }, { headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' } })
}
