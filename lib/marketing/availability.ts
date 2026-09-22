import { prisma } from '@/lib/prisma'
import { catalogAddonSlugs } from './planner'

type EventDates = { id: string; eventDate: Date; eventEndDate?: Date | null }
type CatalogItem = { id: string; name: string; quantity: number; bookableAfter: Date | null; category: { name: string; slug: string; bookableAfter?: Date | null } }
type Reservation = EventDates & { items: { itemId: string | null; quantity: number }[] }

// Booking dates are stored as ISO calendar dates. Compare whole calendar days,
// including multi-day rentals, without depending on the Node server timezone.
const day = (date: Date) => date.toISOString().slice(0, 10)
const start = (date: Date) => new Date(day(date) + 'T00:00:00.000Z')
const end = (date: Date) => new Date(day(date) + 'T23:59:59.999Z')

export function availableMarketingAddons(order: EventDates, catalog: CatalogItem[], reservations: Reservation[], closedDates: Date[]) {
  const from = day(order.eventDate), to = day(order.eventEndDate || order.eventDate)
  if (closedDates.some(date => day(date) >= from && day(date) <= to)) return []
  const items = catalog.filter(item => {
    if (item.bookableAfter && day(item.bookableAfter) > from || item.category.bookableAfter && day(item.category.bookableAfter) > from) return false
    const changes: { date: string; quantity: number }[] = []
    for (const reservation of reservations) {
      const first = day(reservation.eventDate), last = day(reservation.eventEndDate || reservation.eventDate)
      if (first > to || last < from) continue
      const quantity = reservation.items.filter(line => line.itemId === item.id).reduce((sum, line) => sum + line.quantity, 0)
      if (!quantity) continue
      changes.push({ date: first < from ? from : first, quantity })
      const after = new Date(last + 'T12:00:00Z'); after.setUTCDate(after.getUTCDate() + 1)
      changes.push({ date: day(after), quantity: -quantity })
    }
    let reserved = 0, peak = 0
    for (const change of changes.sort((a, b) => a.date.localeCompare(b.date) || a.quantity - b.quantity)) {
      reserved += change.quantity; peak = Math.max(peak, reserved)
    }
    return item.quantity - peak > 0
  })
  return catalogAddonSlugs(items, order.eventDate)
}

export async function marketingAddonAvailability(orders: EventDates[], catalog: CatalogItem[], now: Date) {
  const result = new Map<string, string[]>()
  if (!orders.length || !catalog.length) return result
  const earliest = start(new Date(Math.min(...orders.map(o => o.eventDate.getTime()))))
  const latest = end(new Date(Math.max(...orders.map(o => (o.eventEndDate || o.eventDate).getTime()))))
  const [reservations, closedDates] = await Promise.all([
    prisma.order.findMany({ where: {
      eventDate: { lte: latest }, status: { notIn: ['canceled', 'cancelled', 'draft', 'incomplete'] },
      AND: [
        { OR: [{ eventEndDate: { gte: earliest } }, { eventEndDate: null, eventDate: { gte: earliest } }] },
        { OR: [{ status: { not: 'quote' } }, { status: 'quote', createdAt: { gte: new Date(now.getTime() - 2 * 60 * 60 * 1000) } }] },
      ],
    }, select: { id: true, eventDate: true, eventEndDate: true, items: { where: { itemId: { in: catalog.map(i => i.id) } }, select: { itemId: true, quantity: true } } } }),
    prisma.closedDate.findMany({ where: { date: { gte: earliest, lte: latest } }, select: { date: true } }),
  ])
  for (const order of orders) result.set(order.id, availableMarketingAddons(order, catalog, reservations, closedDates.map(d => d.date)))
  return result
}
