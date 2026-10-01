export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const requested = Number(request.nextUrl.searchParams.get('days') || 30)
  const days = [7, 30, 60, 90, 365].includes(requested) ? requested : 30
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const paidOrders = await prisma.order.findMany({
    where: {
      amountPaid: { gt: 0.01 },
      updatedAt: { gte: start },
      status: { notIn: ['quote', 'incomplete'] },
    },
    select: { id: true, orderNumber: true, tipAmount: true, amountPaid: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
    take: 5000,
  })

  const tippedOrders = paidOrders.filter(order => order.tipAmount > 0.009)
  const tipRevenue = Math.round(tippedOrders.reduce((sum, order) => sum + order.tipAmount, 0) * 100) / 100
  const paid = paidOrders.length
  const tipped = tippedOrders.length

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    window: { days, start: start.toISOString() },
    totals: {
      paid,
      tipped,
      tipRate: paid ? tipped / paid : 0,
      avgTip: tipped ? Math.round((tipRevenue / tipped) * 100) / 100 : 0,
      tipRevenue,
    },
  })
}
