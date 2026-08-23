export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const closedDates = await prisma.closedDate.findMany({ orderBy: { date: 'asc' } })
  return NextResponse.json({ closedDates })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { date, reason } = await request.json()
  const closedDate = await prisma.closedDate.create({
    data: { date: new Date(date), reason: reason || 'Closed' },
  })

  return NextResponse.json({ closedDate })
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { date } = await request.json()
  const dayStart = new Date(date)
  const existing = await prisma.closedDate.findFirst({
    where: {
      date: {
        gte: new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate()),
        lt: new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate() + 1),
      },
    },
  })

  if (existing) {
    await prisma.closedDate.delete({ where: { id: existing.id } })
  }

  return NextResponse.json({ success: true })
}
