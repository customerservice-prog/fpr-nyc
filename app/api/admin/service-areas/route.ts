export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const areas = await prisma.serviceArea.findMany({ orderBy: { city: 'asc' } })
  return NextResponse.json({ areas })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const area = await prisma.serviceArea.create({
    data: {
      city: body.city,
      state: body.state || 'NY',
      zip: body.zip,
      region: body.region,
      baseFee: parseFloat(body.baseFee) || 0,
    },
  })

  return NextResponse.json({ area })
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()
  await prisma.serviceArea.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
