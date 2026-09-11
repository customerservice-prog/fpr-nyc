export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rules = await prisma.bulkPricingRule.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json({ rules })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const rule = await prisma.bulkPricingRule.create({
    data: {
      name: body.name,
      minQuantity: parseInt(body.minQuantity) || 2,
      discountType: body.discountType || 'Percent',
      discountValue: parseFloat(body.discountValue) || 0,
      isActive: body.isActive ?? true,
    },
  })
  return NextResponse.json({ rule })
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
  if ('name' in body) data.name = body.name
  if ('minQuantity' in body) data.minQuantity = parseInt(body.minQuantity)
  if ('discountType' in body) data.discountType = body.discountType
  if ('discountValue' in body) data.discountValue = parseFloat(body.discountValue)
  if ('isActive' in body) data.isActive = body.isActive

  const rule = await prisma.bulkPricingRule.update({ where: { id: body.id }, data })
  return NextResponse.json({ rule })
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await prisma.bulkPricingRule.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
