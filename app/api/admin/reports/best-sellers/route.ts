export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { subDays } from 'date-fns'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as { role?: string }).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const since = subDays(new Date(), 60)

    const orderItems = await prisma.orderItem.findMany({
      where: {
        createdAt: { gte: since },
        itemId: { not: null },
      },
      select: {
        quantity: true,
        item: { select: { category: { select: { name: true } } } },
      },
      take: 5000,
    })

    const categoryCounts: Record<string, number> = {}
    for (const oi of orderItems) {
      const catName = oi.item?.category?.name || 'Other'
      categoryCounts[catName] = (categoryCounts[catName] || 0) + oi.quantity
    }

    const data = Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[reports/best-sellers] failed:', err)
    return NextResponse.json({ error: 'best-sellers failed', detail: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
