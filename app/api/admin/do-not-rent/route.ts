export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

const customers = await prisma.customer.findMany({
  where: { doNotRent: true },
  select: {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    phone: true,
    doNotRentNote: true,
    updatedAt: true,
    orders: {
      select: { id: true, totalAmount: true, amountPaid: true, status: true, createdAt: true },
    },
  },
  orderBy: { updatedAt: 'desc' },
})

const result = customers.map((c) => {
  const activeOrders = c.orders.filter((o) => o.status !== 'cancelled')
  const sortedOrders = c.orders.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  return {
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    phone: c.phone,
    doNotRentNote: c.doNotRentNote,
    updatedAt: c.updatedAt,
    orderCount: activeOrders.length,
    lastOrderDate: sortedOrders.length > 0 ? sortedOrders[0].createdAt : null,
  }
})

return NextResponse.json({ customers: result, total: result.length })
}
