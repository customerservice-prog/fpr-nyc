export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const categories = await prisma.category.findMany({
    include: { items: { select: { id: true } } },
    orderBy: { sortOrder: 'asc' },
  })

  const lightCategories = categories.map((c) => ({ ...c, picture: c.picture ? `/api/category-image/${c.slug}` : null }))
    return NextResponse.json({ categories: lightCategories })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { slugify } = await import('@/lib/utils')

  const category = await prisma.category.create({
    data: {
      name: body.name,
      slug: body.slug || slugify(body.name),
      description: body.description,
      picture: body.picture,
      displayToCustomer: body.displayToCustomer ?? true,
      scheduleProfile: body.scheduleProfile,
      pricingProfile: body.pricingProfile || 'standard',
      sortOrder: body.sortOrder || 0,
    },
  })

  revalidatePath('/')
  return NextResponse.json({ category })
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const data: Record<string, unknown> = {}
  if ('name' in body) {
    data.name = body.name
  }
  if ('slug' in body) {
    data.slug = body.slug
  }
  if ('description' in body) {
    data.description = body.description
  }
  if ('bookableAfter' in body) {
    data.bookableAfter = body.bookableAfter ? new Date(body.bookableAfter) : null
  }
  if ('bookableAfterMessage' in body) {
    data.bookableAfterMessage = body.bookableAfterMessage || null
  }
  if ('displayToCustomer' in body) {
    data.displayToCustomer = body.displayToCustomer
  }
  if ('pricingProfile' in body) {
    data.pricingProfile = body.pricingProfile
  }

  if ('sortOrder' in body) {
    data.sortOrder = parseInt(body.sortOrder)
  }
  if ('picture' in body) {
    data.picture = body.picture
  }
  if ('scheduleProfile' in body) {
    data.scheduleProfile = body.scheduleProfile
  }
  const category = await prisma.category.update({
    where: { id: body.id },
    data,
  })

  revalidatePath('/')
  revalidatePath(`/category/${category.slug}`)
  if ('picture' in data) {
    revalidatePath(`/api/category-image/${category.slug}`)
  }
  return NextResponse.json({ category })
}
