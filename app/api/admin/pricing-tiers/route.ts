export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tiers = await prisma.pricingTier.findMany({
    orderBy: { sortOrder: 'asc' },
  })
  return NextResponse.json({ tiers })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()

  const tier = await prisma.pricingTier.create({
    data: {
      label: body.label,
      minDays: parseInt(body.minDays),
      maxDays: body.maxDays === null || body.maxDays === '' || body.maxDays === undefined ? null : parseInt(body.maxDays),
      percent: parseFloat(body.percent) || 0,
      sortOrder: body.sortOrder ? parseInt(body.sortOrder) : 0,
    },
  })

  return NextResponse.json({ tier })
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const data: Record<string, unknown> = {}
  if ('label' in body) data.label = body.label
  if ('minDays' in body) data.minDays = parseInt(body.minDays)
  if ('maxDays' in body) data.maxDays = body.maxDays === null || body.maxDays === '' ? null : parseInt(body.maxDays)
  if ('percent' in body) data.percent = parseFloat(body.percent)
  if ('sortOrder' in body) data.sortOrder = parseInt(body.sortOrder)

  const tier = await prisma.pricingTier.update({
    where: { id: body.id },
    data,
  })

  return NextResponse.json({ tier })
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = request.nextUrl
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await prisma.pricingTier.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
