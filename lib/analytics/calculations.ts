// Centralized, single-source-of-truth analytics calculations for the
// Friendly Party Rental admin dashboard. Every business metric shown in
// /admin/analytics (and any future analytics tab) must be derived from
// these functions so that the same metric always produces the same result
// everywhere in the admin. Do not re-implement these formulas inline in an
// API route or component -- import from here instead.
//
// Order lifecycle statuses that exist in the database: 'completed',
// 'active', 'canceled', 'quote'.
//
// Definitions used throughout this module:
//   - "Legitimate" orders are orders with status 'completed' or 'active'.
//     Quotes were never booked and canceled orders did not happen, so
//     neither contributes to booked/net revenue, order counts, or rankings.
//   - Refunds are stored as negative-amount rows in the Payment table.
//   - Money values are floats in US dollars. Dates are stored as UTC
//     timestamps in the database; callers are responsible for formatting/
//     displaying dates in the business timezone (America/New_York).

export const LEGITIMATE_ORDER_STATUSES = ['completed', 'active'] as const

export interface AnalyticsOrder {
  id: string
      status: string
      totalAmount: number
      amountPaid: number
      balanceDue?: number
      createdAt: Date | string
      eventDate: Date | string
      customerId: string
      eventCity?: string | null
  eventEndDate?: Date | string | null
eventState?: string | null
      deliveryType?: string | null
    }

    export interface AnalyticsPayment {
      id: string
          orderId: string
          amount: number
          status: string
          createdAt: Date | string
        recordedByName?: string | null
        }

export interface AnalyticsOrderItem {
    orderId: string
        itemName: string
  itemId?: string | null
          quantity: number
        total: number
      }

export interface AnalyticsCustomer {
    id: string
        firstName: string
        lastName: string
        email: string
  city?: string | null
  state?: string | null
      }

export function isLegitimateOrder(order: Pick<AnalyticsOrder, 'status'>): boolean {
  return (LEGITIMATE_ORDER_STATUSES as readonly string[]).includes(order.status)
}

export function filterLegitimateOrders<T extends Pick<AnalyticsOrder, 'status'>>(orders: T[]): T[] {
  return orders.filter(isLegitimateOrder)
}


// Gross Booked Revenue: total value of legitimate (completed + active)
// orders before subtracting refunds. Source: Order.totalAmount.
export function calculateGrossBookedRevenue(orders: AnalyticsOrder[]): number {
  return filterLegitimateOrders(orders).reduce((sum, o) => sum + (o.totalAmount || 0), 0)
}

// Total refunds: sum of negative-amount Payment rows (absolute value).
// Pass a set of order IDs to restrict to a subset of orders (e.g. only
// legitimate orders); omit it to include refunds on every order.
export function calculateRefunds(payments: AnalyticsPayment[], orderIds?: Set<string>): number {
  return payments
    .filter((p) => p.amount < 0 && (!orderIds || orderIds.has(p.orderId)))
    .reduce((sum, p) => sum + Math.abs(p.amount), 0)
}

// Net Booked Revenue: gross booked revenue minus refunds issued against
// legitimate orders.
export function calculateNetBookedRevenue(orders: AnalyticsOrder[], payments: AnalyticsPayment[]): number {
  const legit = filterLegitimateOrders(orders)
  const legitIds = new Set(legit.map((o) => o.id))
  const gross = calculateGrossBookedRevenue(orders)
  const refunds = calculateRefunds(payments, legitIds)
  return gross - refunds
}

// Collected Revenue: actual successful payments received against legitimate
// orders (refund rows are negative and net out automatically). Source:
// Payment.amount where status = 'succeeded'.
export function calculateCollectedRevenue(orders: AnalyticsOrder[], payments: AnalyticsPayment[]): number {
  const legitIds = new Set(filterLegitimateOrders(orders).map((o) => o.id))
  return payments
    .filter((p) => p.status === 'succeeded' && legitIds.has(p.orderId) && !(p.recordedByName || '').toLowerCase().includes('historical backfill'))
    .reduce((sum, p) => sum + p.amount, 0)
}

// Outstanding Balance: money still owed on legitimate orders. Computed as
// totalAmount - amountPaid (floored at zero) rather than trusting the
// stored balanceDue field, since balanceDue can drift out of sync with the
// other two fields (see analytics audit findings).
export function calculateOutstandingBalance(orders: AnalyticsOrder[]): number {
  return filterLegitimateOrders(orders).reduce((sum, o) => {
    const balance = (o.totalAmount || 0) - (o.amountPaid || 0)
    return sum + Math.max(balance, 0)
}, 0)
}

// Order counts broken out by status, plus a "legitimate" total, instead of
// one ambiguous number that mixes quotes, cancellations and real bookings.
export function calculateOrderCounts(orders: AnalyticsOrder[]) {
  const counts: Record<string, number> = {}
  for (const o of orders) {
    counts[o.status] = (counts[o.status] || 0) + 1
}
  return {
    all: orders.length,
    legitimate: filterLegitimateOrders(orders).length,
    completed: counts['completed'] || 0,
    active: counts['active'] || 0,
    canceled: counts['canceled'] || 0,
    quote: counts['quote'] || 0,
}
}

// Average Order Value: Net Booked Revenue divided by the number of
// legitimate orders.
export function calculateAverageOrderValue(orders: AnalyticsOrder[], payments: AnalyticsPayment[]): number {
  const legitCount = filterLegitimateOrders(orders).length
  if (!legitCount) return 0
  return calculateNetBookedRevenue(orders, payments) / legitCount
}

function normalizeEmail(email: string | null | undefined): string {
  return (email || '').trim().toLowerCase()
}

// Unique paying customers: distinct normalized emails among customers who
// have at least one legitimate (completed/active) order. This intentionally
// excludes lead/quote-only contacts and de-duplicates repeated signups that
// share the same email address.
export function calculateCustomerCount(orders: AnalyticsOrder[], customers: AnalyticsCustomer[]): number {
  const legit = filterLegitimateOrders(orders)
  const payingCustomerIds = new Set(legit.map((o) => o.customerId))
  const emails = new Set<string>()
  for (const c of customers) {
    if (payingCustomerIds.has(c.id)) {
      emails.add(normalizeEmail(c.email) || c.id)
}
}
  return emails.size
}

// Repeat customer rate: percentage of paying customers (deduplicated by
// normalized email) who have more than one legitimate order.
export function calculateRepeatCustomerRate(orders: AnalyticsOrder[], customers: AnalyticsCustomer[]): number {
  const legit = filterLegitimateOrders(orders)
  const emailById = new Map(customers.map((c) => [c.id, normalizeEmail(c.email) || c.id]))
  const ordersPerEmail = new Map<string, number>()
  for (const o of legit) {
    const key = emailById.get(o.customerId) || o.customerId
    ordersPerEmail.set(key, (ordersPerEmail.get(key) || 0) + 1)
}
  const total = ordersPerEmail.size
  if (!total) return 0
  const repeat = Array.from(ordersPerEmail.values()).filter((n) => n > 1).length
  return (repeat / total) * 100
}

// Item revenue + units rented, restricted to order items belonging to
// legitimate orders. Uses the historical unit price/total stored on the
// OrderItem row (not today's catalog price). Packages are stored as a
// single OrderItem row rather than exploded into component rows, so there
// is no double counting between package revenue and individual item
// rankings.
export function calculateItemStats(orders: AnalyticsOrder[], orderItems: AnalyticsOrderItem[]) {
  const legitIds = new Set(filterLegitimateOrders(orders).map((o) => o.id))
  const stats = new Map<string, { units: number; revenue: number; orders: number }>()
  for (const oi of orderItems) {
    if (!legitIds.has(oi.orderId)) continue
          const name = oi.itemName || 'Unknown'
          const cur = stats.get(name) || { units: 0, revenue: 0, orders: 0 }
    cur.units += oi.quantity || 0
          cur.revenue += oi.total || 0
          cur.orders += 1
          stats.set(name, cur)
      }
  return stats
    }

export function rankItemsByUnits(orders: AnalyticsOrder[], orderItems: AnalyticsOrderItem[], limit = 15) {
    const stats = calculateItemStats(orders, orderItems)
  return Array.from(stats.entries())
          .map(([name, s]) => ({ name, ...s }))
          .sort((a, b) => b.units - a.units)
          .slice(0, limit)
      }

export function rankItemsByRevenue(orders: AnalyticsOrder[], orderItems: AnalyticsOrderItem[], limit = 15) {
    const stats = calculateItemStats(orders, orderItems)
  return Array.from(stats.entries())
          .map(([name, s]) => ({ name, ...s }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, limit)
      }


function normalizeCity(city: string | null | undefined): string {
    const trimmed = (city || '').trim()
    if (!trimmed) return 'Unknown'
    return trimmed
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

const STATE_NAME_TO_ABBREVIATION: Record<string, string> = {
  'new york': 'NY',
  }

  function normalizeState(state: string | null | undefined): string {
    const trimmed = (state || '').trim()
    if (!trimmed) return 'Unknown'
    const lower = trimmed.toLowerCase()
  if (STATE_NAME_TO_ABBREVIATION[lower]) return STATE_NAME_TO_ABBREVIATION[lower]
    return trimmed.length <= 2 ? trimmed.toUpperCase() : trimmed
  }

// Revenue and order counts grouped by normalized event city, restricted to
// legitimate orders. Event/delivery city (not billing/customer address) is
// used, per business definition -- a rental delivered to Liverpool should
// count as Liverpool business even if the customer's billing city differs.
export function calculateCityStats(orders: AnalyticsOrder[]) {
    const legit = filterLegitimateOrders(orders)
  const stats = new Map<string, { orders: number; revenue: number }>()
        for (const o of legit) {
          const city = normalizeCity(o.eventCity)
          const state = normalizeState(o.eventState)
          const key = city + ', ' + state
          const cur = stats.get(key) || { orders: 0, revenue: 0 }
    cur.orders += 1
          cur.revenue += o.totalAmount || 0
          stats.set(key, cur)
      }
  return stats
      }

export function topCities(orders: AnalyticsOrder[], limit = 12) {
    const stats = calculateCityStats(orders)
  return Array.from(stats.entries())
          .map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => b.revenue - a.revenue)
          .slice(0, limit)
      }

export function calculateStateStats(orders: AnalyticsOrder[]) {
    const legit = filterLegitimateOrders(orders)
  const stats = new Map<string, { orders: number; revenue: number }>()
        for (const o of legit) {
          const state = normalizeState(o.eventState)
          const cur = stats.get(state) || { orders: 0, revenue: 0 }
    cur.orders += 1
          cur.revenue += o.totalAmount || 0
          stats.set(state, cur)
      }
  return stats
      }

export function topStates(orders: AnalyticsOrder[], limit = 8) {
    const stats = calculateStateStats(orders)
  return Array.from(stats.entries())
          .map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => b.orders - a.orders)
          .slice(0, limit)
      }

// Delivery vs. pickup mix, restricted to legitimate orders, based on the
// actual Order.deliveryType field rather than inferring from address
// presence.
export function calculateDeliveryMix(orders: AnalyticsOrder[]) {
    const legit = filterLegitimateOrders(orders)
  const map = new Map<string, number>()
        for (const o of legit) {
          const key = o.deliveryType || 'unknown'
          map.set(key, (map.get(key) || 0) + 1)
      }
        return Array.from(map.entries()).map(([type, count]) => ({ type, count }))
}

// Top customers by booked revenue, restricted to legitimate orders. Also
// reports actual collected payments per customer so revenue is not
// confused with money that hasn't come in yet.
export function calculateTopCustomers(
  orders: AnalyticsOrder[],
  payments: AnalyticsPayment[],
  customers: AnalyticsCustomer[],
  limit = 10
) {
    const legit = filterLegitimateOrders(orders)
  const legitIds = new Set(legit.map((o) => o.id))
        const collectedByOrder = new Map<string, number>()
        for (const p of payments) {
          if (p.status === 'succeeded' && legitIds.has(p.orderId)) {
            collectedByOrder.set(p.orderId, (collectedByOrder.get(p.orderId) || 0) + p.amount)
              }
}
  const byCustomer = new Map<string, { orders: number; revenue: number; collected: number; lastEventDate: Date }>()
  for (const o of legit) {
        const eventDate = new Date(o.eventDate)
        const cur = byCustomer.get(o.customerId) || { orders: 0, revenue: 0, collected: 0, lastEventDate: eventDate }
    cur.orders += 1
          cur.revenue += o.totalAmount || 0
          cur.collected += collectedByOrder.get(o.id) || 0
          if (eventDate > cur.lastEventDate) cur.lastEventDate = eventDate
          byCustomer.set(o.customerId, cur)
      }
  const custById = new Map(customers.map((c) => [c.id, c]))
        return Array.from(byCustomer.entries())
          .sort((a, b) => b[1].revenue - a[1].revenue)
          .slice(0, limit)
          .map(([id, s]) => {
            const c = custById.get(id)
            const name = c ? (c.firstName + ' ' + c.lastName).trim() || 'Customer' : 'Customer'
            return { name, orders: s.orders, revenue: s.revenue, collected: s.collected, lastBooking: s.lastEventDate }
      })
      }

// Revenue + order trend grouped by month, restricted to legitimate orders.
// dateField chooses which business question is being answered:
// 'createdAt' = "when did customers book?" (Revenue by Booking Date)
// 'eventDate' = "when did we perform the rentals?" (Revenue by Event Date)
export function calculateRevenueTrend(
  orders: AnalyticsOrder[],
  months = 12,
        dateField: 'createdAt' | 'eventDate' = 'createdAt'
) {
  const legit = filterLegitimateOrders(orders)
  const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)
      const monthKey = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
      const map = new Map<string, { month: string; revenue: number; orders: number }>()
      for (let i = 0; i < months; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1)
    map.set(monthKey(d), { month: monthKey(d), revenue: 0, orders: 0 })
}
  for (const o of legit) {
        const raw = dateField === 'eventDate' ? o.eventDate : o.createdAt
        const d = new Date(raw as string | Date)
        const key = monthKey(d)
        const bucket = map.get(key)
        if (bucket) {
      bucket.revenue += o.totalAmount || 0
              bucket.orders += 1
        }
}
  return Array.from(map.values())
    }


// ---------------------------------------------------------------------------
// Upcoming business, attention flags and period-over-period insights. These
// build on the same legitimate-order definitions and fields above; they do
// not introduce new revenue or collection formulas.
// ---------------------------------------------------------------------------

export interface UpcomingBusiness {
  windowDays: number
  bookings: number
  bookedRevenue: number
  collected: number
  outstanding: number
  deliveries: number
  pickups: number
  busiestDate: { date: string; orders: number } | null
}

// Upcoming Business: legitimate orders whose event date falls within the
// next `windowDays` days from `now`. Used to show operational workload
// (bookings, delivery/pickup split, revenue not yet fully collected).
export function calculateUpcomingBusiness(orders: AnalyticsOrder[], payments: AnalyticsPayment[], windowDays = 30, now: Date = new Date()): UpcomingBusiness {
  const end = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000)
  const upcoming = filterLegitimateOrders(orders).filter((o) => {
    const d = new Date(o.eventDate)
    return d >= now && d <= end
  })
  const orderIds = new Set(upcoming.map((o) => o.id))
  const collected = payments
    .filter((p) => p.status === 'succeeded' && orderIds.has(p.orderId))
    .reduce((sum, p) => sum + p.amount, 0)
  const bookedRevenue = upcoming.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  const outstanding = upcoming.reduce((sum, o) => {
    const balance = (o.totalAmount || 0) - (o.amountPaid || 0)
    return sum + (balance > 0 ? balance : 0)
  }, 0)
  const deliveries = upcoming.filter((o) => (o.deliveryType || 'delivery') !== 'pickup').length
  const pickups = upcoming.filter((o) => o.deliveryType === 'pickup').length

  const byDate = new Map<string, number>()
  for (const o of upcoming) {
    const key = new Date(o.eventDate).toISOString().slice(0, 10)
    byDate.set(key, (byDate.get(key) || 0) + 1)
  }
  let busiestDate: { date: string; orders: number } | null = null
  for (const entry of byDate.entries()) {
    if (!busiestDate || entry[1] > busiestDate.orders) busiestDate = { date: entry[0], orders: entry[1] }
  }

  return { windowDays, bookings: upcoming.length, bookedRevenue, collected, outstanding, deliveries, pickups, busiestDate }
}

export interface AttentionItem {
  id: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  detail: string
}

// Needs Attention: real, currently-true operational flags derived from
// order/payment data. Every item here must be backed by an actual
// calculation -- never a placeholder or hardcoded warning.
export function calculateNeedsAttention(orders: AnalyticsOrder[], windowDays = 7, now: Date = new Date()): AttentionItem[] {
  const items: AttentionItem[] = []
  const legit = filterLegitimateOrders(orders)
  const end = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000)

  const dueSoon = legit.filter((o) => {
    const d = new Date(o.eventDate)
    const balance = (o.totalAmount || 0) - (o.amountPaid || 0)
    return d >= now && d <= end && balance > 0.01
  })
  if (dueSoon.length > 0) {
    const dueSoonTotal = dueSoon.reduce((sum, o) => sum + ((o.totalAmount || 0) - (o.amountPaid || 0)), 0)
    items.push({
      id: 'due-soon',
      severity: 'warning',
      title: 'Outstanding balances due soon',
      detail: '$' + dueSoonTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' is due across ' + dueSoon.length + ' order' + (dueSoon.length === 1 ? '' : 's') + ' in the next ' + windowDays + ' days.',
    })
  }

  const overpaid = legit.filter((o) => (o.amountPaid || 0) > (o.totalAmount || 0) + 0.01)
  if (overpaid.length > 0) {
    const excess = overpaid.reduce((sum, o) => sum + ((o.amountPaid || 0) - (o.totalAmount || 0)), 0)
    items.push({
      id: 'overpaid',
      severity: 'info',
      title: 'Orders with overpayments',
      detail: overpaid.length + ' order' + (overpaid.length === 1 ? '' : 's') + ' show payments exceeding the order total (about $' + excess.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ').',
    })
  }

  const missingCity = legit.filter((o) => !o.eventCity || !o.eventCity.trim())
  if (missingCity.length > 0) {
    items.push({
      id: 'missing-city',
      severity: 'info',
      title: 'Orders missing an event city',
      detail: missingCity.length + ' legitimate order' + (missingCity.length === 1 ? '' : 's') + ' do not have an event city on file.',
    })
  }

  return items
}

export interface BusinessInsight {
  id: string
  direction: 'up' | 'down' | 'flat'
  text: string
}

// Business Insights: a small number of concise, fully-calculated
// period-over-period observations (trailing windowDays vs the same window
// one year earlier, by order booking date). No fabricated or placeholder
// statements are ever included here.
export function calculateBusinessInsights(orders: AnalyticsOrder[], orderItems: AnalyticsOrderItem[], windowDays = 30, now: Date = new Date()): BusinessInsight[] {
  const insights: BusinessInsight[] = []
  const legit = filterLegitimateOrders(orders)

  const periodStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000)
  const priorStart = new Date(periodStart.getTime() - 365 * 24 * 60 * 60 * 1000)
  const priorEnd = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
  const inRange = (d: Date, start: Date, end: Date) => d >= start && d <= end

  const current = legit.filter((o) => inRange(new Date(o.createdAt), periodStart, now))
  const priorYear = legit.filter((o) => inRange(new Date(o.createdAt), priorStart, priorEnd))

  const currentRevenue = current.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  const priorRevenue = priorYear.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  if (priorRevenue > 0) {
    const change = ((currentRevenue - priorRevenue) / priorRevenue) * 100
    insights.push({
      id: 'revenue-yoy',
      direction: change >= 0 ? 'up' : 'down',
      text: 'Revenue is ' + Math.abs(change).toFixed(0) + '% ' + (change >= 0 ? 'higher' : 'lower') + ' than the same ' + windowDays + '-day period last year.',
    })
  }

  const currentAOV = current.length ? currentRevenue / current.length : 0
  const priorAOV = priorYear.length ? priorRevenue / priorYear.length : 0
  if (priorAOV > 0) {
    const change = ((currentAOV - priorAOV) / priorAOV) * 100
    if (Math.abs(change) >= 1) {
      insights.push({
        id: 'aov-change',
        direction: change >= 0 ? 'up' : 'down',
        text: 'Average order value ' + (change >= 0 ? 'increased' : 'decreased') + ' ' + Math.abs(change).toFixed(0) + '% versus the same period last year.',
      })
    }
  }

  const currentIds = new Set(current.map((o) => o.id))
  const itemRevenue = new Map<string, number>()
  for (const oi of orderItems) {
    if (!currentIds.has(oi.orderId)) continue
    itemRevenue.set(oi.itemName, (itemRevenue.get(oi.itemName) || 0) + (oi.total || 0))
  }
  let topItem: { name: string; revenue: number } | null = null
  for (const entry of itemRevenue.entries()) {
    if (!topItem || entry[1] > topItem.revenue) topItem = { name: entry[0], revenue: entry[1] }
  }
  if (topItem) {
    insights.push({
      id: 'top-item',
      direction: 'flat',
      text: topItem.name + ' generated the most rental revenue over the last ' + windowDays + ' days.',
    })
  }

  return insights
}

export interface BookingLeadTime {
  averageDays: number
  medianDays: number
  buckets: Array<{ label: string; count: number }>
}

export function calculateBookingLeadTime(orders: AnalyticsOrder[]): BookingLeadTime {
  const legit = filterLegitimateOrders(orders)
  const days: number[] = []
    for (const o of legit) {
      const created = new Date(o.createdAt)
      const event = new Date(o.eventDate)
      const diff = Math.round((event.getTime() - created.getTime()) / (24 * 60 * 60 * 1000))
      if (Number.isFinite(diff)) days.push(Math.max(0, diff))
    }
  const sorted = [...days].sort((a, b) => a - b)
  const averageDays = days.length ? days.reduce((s, d) => s + d, 0) / days.length : 0
  const medianDays = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0
  const bucketDefs: Array<{ label: string; min: number; max: number }> = [
    { label: '0-3 days', min: 0, max: 3 },
    { label: '4-7 days', min: 4, max: 7 },
    { label: '8-14 days', min: 8, max: 14 },
    { label: '15-30 days', min: 15, max: 30 },
    { label: '31-60 days', min: 31, max: 60 },
    { label: '61+ days', min: 61, max: Infinity },
    ]
  const buckets = bucketDefs.map((b) => ({
    label: b.label,
    count: days.filter((d) => d >= b.min && d <= b.max).length,
  }))

return { averageDays, medianDays, buckets }
}
export interface CustomerSegments {
  newCustomers: number
  returningCustomers: number
  repeatRate: number
}

export function calculateCustomerSegments(orders: AnalyticsOrder[], customers: AnalyticsCustomer[]): CustomerSegments {
  const legit = filterLegitimateOrders(orders)
  const emailById = new Map(customers.map((c) => [c.id, normalizeEmail(c.email) || c.id]))
  const ordersPerEmail = new Map<string, number>()
  for (const o of legit) {
    const key = emailById.get(o.customerId) || o.customerId
    ordersPerEmail.set(key, (ordersPerEmail.get(key) || 0) + 1)
  }
  const total = ordersPerEmail.size
  const returningCustomers = Array.from(ordersPerEmail.values()).filter((n) => n > 1).length
  const newCustomers = total - returningCustomers
  const repeatRate = total ? (returningCustomers / total) * 100 : 0
  return { newCustomers, returningCustomers, repeatRate }
}
export interface AnalyticsItem {
  id: string
  name: string
  quantity: number
}

export interface ItemReservation {
  itemId: string | null
  orderId: string
  quantity: number
}

export interface OrderDateMeta {
  status: string
  eventDate: Date | string
  eventEndDate?: Date | string | null
}

export interface ItemUtilization {
  itemId: string
  name: string
  owned: number
  peakReserved: number
  peakDate: string | null
  available: number
  utilizationPct: number
  highDemand: boolean
}

export function calculateInventoryUtilization(
  items: AnalyticsItem[],
  reservations: ItemReservation[],
  orderMeta: Map<string, OrderDateMeta>,
  windowDays = 14,
  now: Date = new Date()
  ): ItemUtilization[] {
  const dayKey = (d: Date) => d.toISOString().slice(0, 10)
  const days: string[] = []
    for (let i = 0; i < windowDays; i++) {
      days.push(dayKey(new Date(now.getTime() + i * 24 * 60 * 60 * 1000)))
    }
  const reservedByItemByDay = new Map<string, Map<string, number>>()
  for (const r of reservations) {
    if (!r.itemId) continue
    const meta = orderMeta.get(r.orderId)
    if (!meta || !isLegitimateOrder({ status: meta.status })) continue
    const startStr = dayKey(new Date(meta.eventDate))
    const endStr = meta.eventEndDate ? dayKey(new Date(meta.eventEndDate)) : startStr
    for (const day of days) {
      if (day >= startStr && day <= endStr) {
        let byDay = reservedByItemByDay.get(r.itemId)
        if (!byDay) {
          byDay = new Map<string, number>()
          reservedByItemByDay.set(r.itemId, byDay)
        }
        byDay.set(day, (byDay.get(day) || 0) + r.quantity)
      }
    }
  }
  const results: ItemUtilization[] = []
    for (const item of items) {
      const byDay = reservedByItemByDay.get(item.id)
      let peakReserved = 0
      let peakDate: string | null = null
      if (byDay) {
        for (const entry of byDay.entries()) {
          if (entry[1] > peakReserved) {
            peakReserved = entry[1]
            peakDate = entry[0]
          }
        }
      }
      const owned = item.quantity || 0
      const available = Math.max(0, owned - peakReserved)
      const utilizationPct = owned > 0 ? Math.min(999, (peakReserved / owned) * 100) : 0
      results.push({
        itemId: item.id,
        name: item.name,
        owned,
        peakReserved,
        peakDate,
        available,
        utilizationPct,
        highDemand: owned > 0 && peakReserved / owned >= 0.8,
      })
    }
  return results.sort((a, b) => b.utilizationPct - a.utilizationPct)
}
