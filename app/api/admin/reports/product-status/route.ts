export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const dateParam = searchParams.get('date')

  const day = dateParam ? new Date(dateParam + 'T00:00:00') : new Date()
  const start = new Date(day)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  const orders = await prisma.order.findMany({
    where: {
      eventDate: { gte: start, lt: end },
      status: { notIn: ['cancelled', 'canceled', 'quote'] },
    },
    include: {
      items: {
        include: { item: { include: { category: true } } },
      },
    },
    orderBy: { orderNumber: 'asc' },
  })

  const categories: Record<string, { orderId: string; orderNumber: string; itemName: string; quantity: number }[]> = {}

  for (const order of orders) {
    for (const oi of order.items) {
      const catName = oi.item?.category?.name || 'Uncategorized'
      if (!categories[catName]) categories[catName] = []
      categories[catName].push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        itemName: oi.itemName,
        quantity: oi.quantity,
      })
    }
  }

  const sortedCategories = Object.keys(categories)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      category: name,
      rows: categories[name],
    }))

  return NextResponse.json({
    date: start.toISOString().split('T')[0],
    orderCount: orders.length,
    categories: sortedCategories,
  })
}
