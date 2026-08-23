export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const page = parseInt(request.nextUrl.searchParams.get('page') || '1')
  const search = request.nextUrl.searchParams.get('search')
  const requestedPerPage = parseInt(request.nextUrl.searchParams.get('perPage') || '100')
  const perPage = Math.min(requestedPerPage || 100, 500)

  const categoryId = request.nextUrl.searchParams.get('categoryId')
  const where: Record<string, unknown> = search ? {
    name: { contains: search, mode: 'insensitive' as const },
  } : {}
  if (categoryId) where.categoryId = categoryId

  const [items, total] = await Promise.all([
    prisma.item.findMany({
      where,
      select: {
        id: true, name: true, slug: true, description: true, type: true,
        cost: true, quantity: true, displayToCustomer: true, scheduleProfile: true,
        categoryId: true, status: true, attentionNotes: true, lastInspectedAt: true,
        bookableAfter: true, bookableAfterMessage: true, specialDisplayName: true,
        sku: true, setupArea: true, actualSize: true, attendants: true, ageGroup: true,
        additionalImages: true, colorOptions: true, taxable: true, setupFee: true,
        internalNotes: true, suggestedAddonIds: true, createdAt: true, updatedAt: true,
        category: { select: { id: true, name: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.item.count({ where }),
  ])

  return NextResponse.json({ items, total, page, perPage })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { slugify } = await import('@/lib/utils')

  const item = await prisma.item.create({
    data: {
      name: body.name,
      slug: body.slug || slugify(body.name),
      description: body.description,
      type: body.type || 'Regular',
      cost: parseFloat(body.cost),
      quantity: parseInt(body.quantity) || 1,
      picture: body.picture,
      displayToCustomer: body.displayToCustomer ?? true,
      scheduleProfile: body.scheduleProfile,
      categoryId: body.categoryId,
      specialDisplayName: body.specialDisplayName || null,
      sku: body.sku || null,
      setupArea: body.setupArea || null,
      actualSize: body.actualSize || null,
      attendants: body.attendants ? parseInt(body.attendants) : null,
      ageGroup: body.ageGroup || null,
      additionalImages: body.additionalImages || [], colorOptions: body.colorOptions || [],
      taxable: body.taxable ?? true,
      setupFee: body.setupFee ? parseFloat(body.setupFee) : null,
      internalNotes: body.internalNotes || null,
      suggestedAddonIds: body.suggestedAddonIds || [],
    },
    include: { category: true },
  })

  return NextResponse.json({ item })
}
