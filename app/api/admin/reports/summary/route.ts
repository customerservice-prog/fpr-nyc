export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth } from 'date-fns'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as { role?: string }).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

const [
  totalRevenueAgg,
  revenueThisMonthAgg,
  outstandingAgg,
  totalOrders,
  ordersByStatusRaw,
  ordersByDeliveryTypeRaw,
  totalCustomers,
  newCustomersThisMonth,
  upcoming7,
  upcoming30,
  ordersWithBalance,
  pendingPaymentsAgg,
  ] = await Promise.all([
  prisma.order.aggregate({ _sum: { amountPaid: true } }),
prisma.payment.findMany({
        where: { createdAt: { gte: monthStart, lte: monthEnd } },
        select: { amount: true, notes: true },
}),
  prisma.order.aggregate({
    _sum: { balanceDue: true },
    _count: true,
    where: { balanceDue: { gt: 0 }, status: { notIn: ['canceled', 'quote'] } },
  }),
  prisma.order.count(),
  prisma.order.groupBy({ by: ['status'], _count: true }),
  prisma.order.groupBy({ by: ['deliveryType'], _count: true }),
  prisma.customer.count(),
  prisma.customer.count({
    where: {
      createdAt: { gte: monthStart, lte: monthEnd },
      orders: { some: { orderNumber: { not: { startsWith: 'ERS-' } } } },
    },
  }),
  prisma.order.count({
    where: { eventDate: { gte: now, lte: in7Days }, status: { not: 'canceled' } },
  }),
  prisma.order.count({
    where: { eventDate: { gte: now, lte: in30Days }, status: { not: 'canceled' } },
  }),
  prisma.order.findMany({
    where: { balanceDue: { gt: 0 }, status: { notIn: ['canceled', 'quote'] } },
    orderBy: { eventDate: 'asc' },
    take: 25,
    include: { customer: true },
  }),
  prisma.payment.aggregate({
    _sum: { pendingAmount: true },
    _count: true,
    where: { status: 'pending' },
  }),
  ])

const totalRevenue = totalRevenueAgg._sum.amountPaid || 0
  const revenueThisMonth = revenueThisMonthAgg.reduce((sum, p) => sum + p.amount, 0)
  const outstandingBalance = outstandingAgg._sum.balanceDue || 0
  const outstandingOrderCount = outstandingAgg._count || 0
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const pendingPaymentsCount = pendingPaymentsAgg._count || 0
  const pendingPaymentsAmount = pendingPaymentsAgg._sum.pendingAmount || 0

const ordersByStatus = ordersByStatusRaw.map((s) => ({ status: s.status, count: s._count }))
  const ordersByDeliveryType = ordersByDeliveryTypeRaw.map((d) => ({
    deliveryType: d.deliveryType,
    count: d._count,
  }))

const balanceDueOrders = ordersWithBalance.map((o) => ({
  id: o.id,
  orderNumber: o.orderNumber,
  customerName: o.customer.firstName + ' ' + o.customer.lastName,
  eventDate: o.eventDate,
  totalAmount: o.totalAmount,
  amountPaid: o.amountPaid,
  balanceDue: o.balanceDue,
}))

return NextResponse.json({
  totalRevenue,
  revenueThisMonth,
  outstandingBalance,
  outstandingOrderCount,
  totalOrders,
  totalCustomers,
  newCustomersThisMonth,
  averageOrderValue,
  upcoming7,
  upcoming30,
  ordersByStatus,
  ordersByDeliveryType,
  balanceDueOrders,
  pendingPaymentsCount,
  pendingPaymentsAmount,
})
}
