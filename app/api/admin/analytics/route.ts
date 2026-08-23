export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GA_MEASUREMENT_ID } from '@/lib/gtag'

// Analytics dashboard data. All figures below are derived from first-party
// order/customer data stored in our own database. Website visitor traffic
// (sessions, page views, visitor geography, acquisition sources) and search
// ranking data live in Google Analytics / Google Search Console and are only
// available once server-side Google API credentials are configured. We expose
// the connection status so the UI can show real numbers when connected and a
// clear "connect" state when not.

type MonthBucket = { month: string; revenue: number; orders: number }

function monthKey(d: Date) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  const [orders, orderItems, totalCustomers, totalItems] = await Promise.all([
    prisma.order.findMany({
      select: {
        id: true,
        totalAmount: true,
        amountPaid: true,
        eventCity: true,
        eventState: true,
        deliveryType: true,
        createdAt: true,
        eventDate: true,
        customerId: true,
      },
    }),
    prisma.orderItem.findMany({
      select: { itemName: true, quantity: true, total: true },
    }),
    prisma.customer.count(),
    prisma.item.count(),
  ])

  const totalOrders = orders.length
  const totalRevenue = orders.reduce((s, o) => s + (o.totalAmount || 0), 0)
  const totalCollected = orders.reduce((s, o) => s + (o.amountPaid || 0), 0)
  const averageOrderValue = totalOrders ? totalRevenue / totalOrders : 0

  // Item rankings: by units rented and by revenue
  const itemStats = new Map<string, { units: number; revenue: number; orders: number }>()
  for (const oi of orderItems) {
    const name = oi.itemName || 'Unknown'
    const cur = itemStats.get(name) || { units: 0, revenue: 0, orders: 0 }
    cur.units += oi.quantity || 0
    cur.revenue += oi.total || 0
    cur.orders += 1
    itemStats.set(name, cur)
  }
  const rankedByUnits = Array.from(itemStats.entries())
    .map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => b.units - a.units)
    .slice(0, 15)
  const rankedByRevenue = Array.from(itemStats.entries())
    .map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 15)

  // Revenue + order trend by month (last 12 months)
  const monthMap = new Map<string, MonthBucket>()
  for (let i = 0; i < 12; i++) {
    const d = new Date(twelveMonthsAgo.getFullYear(), twelveMonthsAgo.getMonth() + i, 1)
    monthMap.set(monthKey(d), { month: monthKey(d), revenue: 0, orders: 0 })
  }
  for (const o of orders) {
    const k = monthKey(new Date(o.createdAt))
    const bucket = monthMap.get(k)
    if (bucket) {
      bucket.revenue += o.totalAmount || 0
      bucket.orders += 1
    }
  }
  const revenueTrend = Array.from(monthMap.values())

  // Geography: where bookings come from (event city / state)
  const cityStats = new Map<string, { orders: number; revenue: number }>()
  const stateStats = new Map<string, { orders: number; revenue: number }>()
  for (const o of orders) {
    const city = (o.eventCity || 'Unknown').trim() + (o.eventState ? ', ' + o.eventState.trim() : '')
    const st = (o.eventState || 'Unknown').trim() || 'Unknown'
    const c = cityStats.get(city) || { orders: 0, revenue: 0 }
    c.orders += 1
    c.revenue += o.totalAmount || 0
    cityStats.set(city, c)
    const s = stateStats.get(st) || { orders: 0, revenue: 0 }
    s.orders += 1
    s.revenue += o.totalAmount || 0
    stateStats.set(st, s)
  }
  const topCities = Array.from(cityStats.entries())
    .map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 12)
  const topStates = Array.from(stateStats.entries())
    .map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 8)

  // Delivery mix
  const deliveryMap = new Map<string, number>()
  for (const o of orders) {
    const k = o.deliveryType || 'unknown'
    deliveryMap.set(k, (deliveryMap.get(k) || 0) + 1)
  }
  const deliveryMix = Array.from(deliveryMap.entries()).map(([type, count]) => ({ type, count }))

  // Top customers by revenue
  const custMap = new Map<string, { orders: number; revenue: number }>()
  for (const o of orders) {
    if (!o.customerId) continue
    const c = custMap.get(o.customerId) || { orders: 0, revenue: 0 }
    c.orders += 1
    c.revenue += o.totalAmount || 0
    custMap.set(o.customerId, c)
  }
  const topCustomerIds = Array.from(custMap.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 10)
  const customerRecords = await prisma.customer.findMany({
    where: { id: { in: topCustomerIds.map(([id]) => id) } },
    select: { id: true, firstName: true, lastName: true },
  })
  const custName = new Map(customerRecords.map((c) => [c.id, (c.firstName || '') + ' ' + (c.lastName || '')]))
  const topCustomers = topCustomerIds.map(([id, s]) => ({
    name: (custName.get(id) || 'Customer').trim() || 'Customer',
    orders: s.orders,
    revenue: s.revenue,
  }))

  // Google connection status. These become "connected" once the corresponding
  // server-side credentials are added to the environment. Until then the UI
  // shows a connect state instead of fabricated numbers.
  const google = {
    measurementId: GA_MEASUREMENT_ID,
    analyticsConnected: Boolean(process.env.GA_PROPERTY_ID && process.env.GOOGLE_APPLICATION_CREDENTIALS),
    searchConsoleConnected: Boolean(process.env.GSC_SITE_URL && process.env.GOOGLE_APPLICATION_CREDENTIALS),
    analyticsUrl: 'https://analytics.google.com/',
    searchConsoleUrl: 'https://search.google.com/search-console',
  }

  return NextResponse.json({
    generatedAt: now.toISOString(),
    totals: {
      totalRevenue,
      totalCollected,
      totalOrders,
      totalCustomers,
      totalItems,
      averageOrderValue,
    },
    rankedByUnits,
    rankedByRevenue,
    revenueTrend,
    topCities,
    topStates,
    deliveryMix,
    topCustomers,
    google,
  })
}
