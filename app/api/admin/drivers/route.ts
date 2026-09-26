export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const activeOnly = searchParams.get('activeOnly') === 'true'

  const drivers = await prisma.driver.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ drivers })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const driver = await prisma.driver.create({
    data: {
      name: body.name.trim(),
      phone: body.phone || null,
      email: body.email || null,
      vehicleInfo: body.vehicleInfo || null,
      notes: body.notes || null,
      isActive: body.isActive !== undefined ? body.isActive : true,
    },
  })
  return NextResponse.json({ driver })
}
