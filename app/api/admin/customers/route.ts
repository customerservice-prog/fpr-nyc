export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const search = request.nextUrl.searchParams.get('search')?.trim() || ''
  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.min(
    200,
    Math.max(1, parseInt(request.nextUrl.searchParams.get('pageSize') || '50', 10) || 50)
  )

  const words = search.split(/\s+/).filter(Boolean)
  const where =
    words.length > 0
      ? {
          AND: words.map((word) => ({
            OR: [
              { firstName: { contains: word, mode: 'insensitive' as const } },
              { lastName: { contains: word, mode: 'insensitive' as const } },
              { email: { contains: word, mode: 'insensitive' as const } },
              { phone: { contains: word, mode: 'insensitive' as const } },
              { orders: { some: { orderNumber: { contains: word, mode: 'insensitive' as const } } } },
            ],
          })),
        }
      : undefined

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      // NOTE: explicit select (not `include`) so this query does not read the
      // `unsubscribed` column, which may not yet exist in the production DB.
      // Run `npx prisma db push` to add it, then this can safely go back to include.
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        company: true,
        secondaryPhone: true,
        secondaryEmail: true,
        customerType: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        notes: true,
        creditStatus: true,
        createdAt: true,
        updatedAt: true,
        orders: {
          select: { id: true, totalAmount: true, amountPaid: true, balanceDue: true, status: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  const result = customers.map((c) => {
    const activeOrders = c.orders.filter((o) => o.status !== 'cancelled')
    return {
      ...c,
      orderCount: activeOrders.length,
      totalSpent: activeOrders.reduce((sum, o) => sum + o.amountPaid, 0),
      balanceDue: activeOrders.reduce((sum, o) => sum + o.balanceDue, 0),
      lastOrderDate:
        c.orders.length > 0
          ? c.orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt
          : null,
    }
  })

  return NextResponse.json({ customers: result, total, page, pageSize })
}
