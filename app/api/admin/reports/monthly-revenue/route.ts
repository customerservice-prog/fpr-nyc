export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { subMonths, startOfMonth, endOfMonth } from 'date-fns'

export async function GET() {
  const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as { role?: string }).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const months: Array<{ month: string; revenue: number }> = []
  const now = new Date()

  for (let i = 18; i >= 0; i--) {
    const date = subMonths(now, i)
    const monthStart = startOfMonth(date)
    const monthEnd = endOfMonth(date)

    const result = await prisma.payment.aggregate({
      where: { createdAt: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    })

    months.push({
      month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      revenue: result._sum.amount || 0,
    })
  }

  return NextResponse.json({ data: months })
}
