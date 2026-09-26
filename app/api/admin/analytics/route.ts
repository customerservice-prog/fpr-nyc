export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GA_MEASUREMENT_ID } from '@/lib/gtag'
import {
  calculateGrossBookedRevenue,
  calculateNetBookedRevenue,
  calculateCollectedRevenue,
  calculateOutstandingBalance,
  calculateRefunds,
  calculateOrderCounts,
  calculateAverageOrderValue,
  calculateCustomerCount,
  rankItemsByUnits,
  rankItemsByRevenue,
  calculateRevenueTrend,
  topCities,
  topStates,
  calculateDeliveryMix,
  calculateTopCustomers,
  filterLegitimateOrders,
  calculateUpcomingBusiness,
  calculateNeedsAttention,
  calculateBusinessInsights,
  calculateBookingLeadTime,
  calculateCustomerSegments,
  calculateInventoryUtilization,
} from '@/lib/analytics/calculations'

// Analytics dashboard data. All business figures below (revenue, orders,
// customers, items, rankings, geography, delivery mix) are derived from
// first-party order/payment/customer data using the centralized calculation
// functions in lib/analytics/calculations.ts -- add a new function to the
// calculations module instead so the same metric always means the same
// thing everywhere in the admin.
//
// Website visitor traffic (sessions, page views, visitor geography,
// acquisition sources) and search ranking data live in Google Analytics /
// Google Search Console and are only available once server-side Google API
// credentials are configured. We expose the connection status so the UI can
// show real numbers when connected and a clear "connect" state when not.
//
// The optional ?range= query param (days, or omitted for all-time) narrows
// the historical totals/rankings/geography/customer figures to orders
// booked (createdAt) within that window. Forward-looking figures (upcoming
// business, needs attention, insights) and the fixed 12-month trend are
// unaffected by this filter, since they answer a different question than
// "totals for the selected historical window".

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const { searchParams } = new URL(request.url)
  const rangeParam = searchParams.get('range')
  const rangeDays = rangeParam && rangeParam !== 'all' ? Number(rangeParam) : null
  const rangeStart = rangeDays && !Number.isNaN(rangeDays) ? new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000) : null

  const [allOrders, allOrderItems, allPayments, customers, items, totalItemsCount, activeItemsCount] = await Promise.all([
    prisma.order.findMany({
      select: {
        id: true,
        status: true,
        totalAmount: true,
        amountPaid: true,
        balanceDue: true,
        eventCity: true, eventEndDate: true,
        eventState: true,
        deliveryType: true,
        createdAt: true,
        eventDate: true,
        customerId: true,
      },
    }),
    prisma.orderItem.findMany({
      select: { orderId: true, itemName: true, quantity: true, total: true, itemId: true },
    }),
    prisma.payment.findMany({
      select: { id: true, orderId: true, amount: true, status: true, createdAt: true, recordedByName: true },
    }),
    prisma.customer.findMany({
      select: { id: true, firstName: true, lastName: true, email: true, city: true, state: true },
    }),
    prisma.item.findMany({ select: { id: true, name: true, quantity: true } }),
    prisma.item.count(),
    prisma.item.count({ where: { displayToCustomer: true } }),
  ])

  // Orders/payments restricted to the selected historical range for KPI
  // cards, rankings, geography and customer figures. Forward-looking data
  // (upcoming business, needs-attention, insights) always uses the full
  // unfiltered order set below, since "outstanding balance right now" and
  // "what's booked next month" are not meant to be scoped to a historical
  // booking-date window.
  const orders = rangeStart ? allOrders.filter((o) => new Date(o.createdAt) >= rangeStart) : allOrders
  const orderIdsInRange = new Set(orders.map((o) => o.id))
  const orderItems = rangeStart ? allOrderItems.filter((oi) => orderIdsInRange.has(oi.orderId)) : allOrderItems
  const payments = rangeStart ? allPayments.filter((p) => orderIdsInRange.has(p.orderId)) : allPayments

  const orderCounts = calculateOrderCounts(orders)
  const grossBookedRevenue = calculateGrossBookedRevenue(orders)
  const netBookedRevenue = calculateNetBookedRevenue(orders, payments)
  const totalCollected = calculateCollectedRevenue(orders, payments)
  const outstandingBalance = calculateOutstandingBalance(allOrders)
  const legitimateOrderIds = new Set(filterLegitimateOrders(orders).map((o) => o.id))
  const totalRefunds = calculateRefunds(payments, legitimateOrderIds)
  const averageOrderValue = calculateAverageOrderValue(orders, payments)
  const totalCustomers = calculateCustomerCount(orders, customers)
  const customerSegments = calculateCustomerSegments(orders, customers)
  const bookingLeadTime = calculateBookingLeadTime(orders)

  const rankedByUnits = rankItemsByUnits(orders, orderItems)
  const rankedByRevenue = rankItemsByRevenue(orders, orderItems)
  const revenueTrend = calculateRevenueTrend(allOrders, 12, 'createdAt')
  const cities = topCities(orders)
  const states = topStates(orders)
  const deliveryMix = calculateDeliveryMix(orders)
  const topCustomersList = calculateTopCustomers(orders, payments, customers)

  const upcomingBusiness = calculateUpcomingBusiness(allOrders, allPayments, 30, now)
  const needsAttention = calculateNeedsAttention(allOrders, 7, now)
  const insights = calculateBusinessInsights(allOrders, allOrderItems, 30, now)

  const orderMeta = new Map(allOrders.map((o) => [o.id, { status: o.status, eventDate: o.eventDate, eventEndDate: o.eventEndDate }]))
  const itemReservations = allOrderItems.map((oi) => ({ itemId: oi.itemId, orderId: oi.orderId, quantity: oi.quantity }))
  const inventoryUtilization = calculateInventoryUtilization(items, itemReservations, orderMeta, 14, now)

  // Google connection status. These become "connected" once the corresponding
  // server-side credentials are added to the environment. Until then the UI
  // shows a connect state instead of fabricated numbers.
  const google = {
    measurementId: GA_MEASUREMENT_ID,
    analyticsConnected: Boolean(process.env.GA_PROPERTY_ID && process.env.GOOGLE_APPLICATION_CREDENTIALS),
    searchConsoleConnected: Boolean(process.env.GNYC_SITE_URL && process.env.GOOGLE_APPLICATION_CREDENTIALS),
    analyticsUrl: 'https://analytics.google.com/',
    searchConsoleUrl: 'https://search.google.com/search-console',
  }

  return NextResponse.json({
    generatedAt: now.toISOString(),
    rangeDays,
    totals: {
      totalRevenue: netBookedRevenue,
      grossBookedRevenue,
      totalCollected,
      outstandingBalance,
      totalRefunds,
      totalOrders: orderCounts.legitimate,
      orderCounts,
      totalCustomers,
      totalItems: activeItemsCount,
      totalCatalogRecords: totalItemsCount,
      averageOrderValue,
    },
    rankedByUnits,
    rankedByRevenue,
    revenueTrend,
    topCities: cities,
    topStates: states,
    deliveryMix,
    topCustomers: topCustomersList,
    upcomingBusiness,
    needsAttention,
    insights,
    bookingLeadTime,
    customerSegments,
    inventoryUtilization,
    google,
  })
}
