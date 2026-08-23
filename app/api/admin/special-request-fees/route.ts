export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const fees = await prisma.specialRequestFee.findMany({
    orderBy: { sortOrder: 'asc' },
  })
  return NextResponse.json({ fees })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const fee = await prisma.specialRequestFee.create({
    data: {
      name: body.name,
      amount: parseFloat(body.amount) || 0,
      isActive: body.isActive ?? true,
      sortOrder: body.sortOrder ? parseInt(body.sortOrder) : 0,
    },
  })

  return NextResponse.json({ fee })
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const data: Record<string, unknown> = {}
  if ('name' in body) data.name = body.name
  if ('amount' in body) data.amount = parseFloat(body.amount)
  if ('isActive' in body) data.isActive = body.isActive
  if ('sortOrder' in body) data.sortOrder = parseInt(body.sortOrder)

  const fee = await prisma.specialRequestFee.update({
    where: { id: body.id },
    data,
  })

  return NextResponse.json({ fee })
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await prisma.specialRequestFee.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
