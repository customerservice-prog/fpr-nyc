import { prisma } from '@/lib/prisma'
import { getSuppressedEmails, isTestRecord, isValidEmailFormat, normalizeEmail } from '@/lib/marketing/eligibility'
export async function getMarketingContacts(email?: string) {
  const [customers, suppressed] = await Promise.all([
    prisma.customer.findMany({ ...(email ? { where: { email: { equals: normalizeEmail(email), mode: 'insensitive' as const } } } : {}), select: { id: true, email: true, firstName: true, lastName: true, orders: { where: { status: { notIn: ['canceled','cancelled','quote','draft','incomplete'] } }, select: { eventDate: true, createdAt: true, amountPaid: true, balanceDue: true } } } }),
    getSuppressedEmails(),
  ])
  const now = Date.now()
  const map = new Map<string, { email: string; firstName: string; lastName: string; customerIds: string[]; eligible: boolean; reason: string; hasPaidOrder: boolean; hasUpcomingEvent: boolean; hasBalance: boolean; lastEvent: Date | null; lastBooking: Date | null; daysSinceEvent: number | null }>()
  for (const c of customers) {
    if (!c.orders.length) continue // Incomplete/quote-only leads use their dedicated follow-up flow, never general marketing.
    const email = normalizeEmail(c.email), key = email || `invalid:${c.id}`
    const reason = !isValidEmailFormat(email) ? 'Invalid email' : isTestRecord(email,c.firstName,c.lastName) ? 'Test record' : suppressed.has(email) ? 'Unsubscribed or restricted' : ''
    let row = map.get(key)
    if (!row) { row = { email, firstName: c.firstName, lastName: c.lastName, customerIds: [], eligible: !reason, reason, hasPaidOrder: false, hasUpcomingEvent: false, hasBalance: false, lastEvent: null, lastBooking: null, daysSinceEvent: null }; map.set(key,row) }
    if (reason) { row.eligible = false; row.reason = reason }
    row.customerIds.push(c.id)
    for (const o of c.orders) {
      row.hasPaidOrder ||= o.amountPaid > 0; row.hasBalance ||= o.balanceDue > 0
      if (!row.lastBooking || o.createdAt > row.lastBooking) row.lastBooking = o.createdAt
      if (o.eventDate.getTime() > now) row.hasUpcomingEvent = true
      else if (!row.lastEvent || o.eventDate > row.lastEvent) row.lastEvent = o.eventDate
    }
    row.daysSinceEvent = row.lastEvent ? (now - row.lastEvent.getTime()) / 86400000 : null
  }
  return [...map.values()].sort((a,b) => (b.lastBooking?.getTime() || 0) - (a.lastBooking?.getTime() || 0))
}
export function matchesMarketingSegment(row: Awaited<ReturnType<typeof getMarketingContacts>>[number], segment: string) {
  if (segment === 'suppressed') return !row.eligible
  if (!row.eligible) return false
  switch (segment) {
    case 'all': return !row.hasUpcomingEvent
    case 'eligible': return true
    case 'outstanding': return row.hasBalance
    case 'recent': return !!row.lastBooking && row.lastBooking.getTime() >= Date.now() - 90 * 86400000
    case 'lapsed': return !!row.lastBooking && !row.hasUpcomingEvent && row.lastBooking.getTime() < Date.now() - 180 * 86400000
    case 'dormant': return !row.hasUpcomingEvent && row.daysSinceEvent !== null && row.daysSinceEvent >= 365
    case 'annualRebooking': return !row.hasUpcomingEvent && row.daysSinceEvent !== null && row.daysSinceEvent >= 270 && row.daysSinceEvent <= 456
    case 'upcoming': return row.hasUpcomingEvent
    case 'highConfidence': return row.hasPaidOrder && !row.hasUpcomingEvent
    default: return false
  }
}
