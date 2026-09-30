// Server-side stock and exact-time capacity checks for NYC online orders.
//
// Every check runs inside the same database transaction as the order write and
// behind one Postgres advisory lock, so two customers checking out at the same
// moment can never both be sold the last units or the same exact-time slot.
//
// Stock is per catalog item: every color of an item shares that item's quantity.
// A rental blocks stock for its whole period (event date through end date), so a
// multi-day rental also blocks the following days.
import { endOfDay, startOfDay } from 'date-fns'
import type { Prisma } from '@prisma/client'
import { effectiveEventEndDate } from './orderDates'

/** Arbitrary constant key for pg_advisory_xact_lock (NYC order capacity). */
export const NYC_CAPACITY_LOCK_KEY = 815301
// Unpaid online checkouts hold stock for this long (same window as lib/availability.ts).
const RECENT_QUOTE_WINDOW_MS = 2 * 60 * 60 * 1000
const INACTIVE_STATUSES = ['canceled', 'cancelled', 'draft', 'incomplete']

type Tx = Prisma.TransactionClient

/** Serializes capacity decisions until the surrounding transaction ends. */
export async function lockNycCapacity(tx: Tx): Promise<void> {
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${NYC_CAPACITY_LOCK_KEY})`)
}

export interface RentalPeriod {
  start: Date
  end: Date
}

export function rentalPeriod(eventDate: Date | string, rentalDays?: number | null, eventEndDate?: Date | string | null): RentalPeriod {
  const start = startOfDay(new Date(eventDate))
  const end = endOfDay(effectiveEventEndDate(new Date(eventDate), eventEndDate ?? null, rentalDays ?? 1))
  return { start, end: end < start ? endOfDay(start) : end }
}

/**
 * Confirmed orders always hold stock. An unpaid quote holds it only while its
 * checkout is recent (last checkout activity, or creation for staff quotes).
 */
export function holdsStockWhere(now: number = Date.now()): Prisma.OrderWhereInput {
  const cutoff = new Date(now - RECENT_QUOTE_WINDOW_MS)
  return {
    OR: [
      { status: { not: 'quote' } },
      { status: 'quote', checkoutLastSeenAt: { gte: cutoff } },
      { status: 'quote', checkoutLastSeenAt: null, createdAt: { gte: cutoff } },
    ],
  }
}

/** Orders whose rental period overlaps `period` and that currently hold stock. */
function overlappingActiveOrders(period: RentalPeriod, excludeOrderId?: string | null): Prisma.OrderWhereInput {
  return {
    ...(excludeOrderId ? { id: { not: excludeOrderId } } : {}),
    status: { notIn: INACTIVE_STATUSES },
    eventDate: { lte: period.end },
    AND: [
      holdsStockWhere(),
      { OR: [{ eventEndDate: { gte: period.start } }, { eventEndDate: null, eventDate: { gte: period.start } }] },
    ],
  }
}

export interface InventoryShortfall {
  itemId: string
  name: string
  requested: number
  available: number
}

/**
 * Requested quantity per item id (all colors combined) versus stock for the whole
 * rental period. Hidden, unavailable and not-yet-bookable items have 0 available.
 */
export async function findInventoryShortfalls(
  tx: Tx,
  requested: Map<string, number>,
  period: RentalPeriod,
  excludeOrderId?: string | null,
): Promise<InventoryShortfall[]> {
  const ids = Array.from(requested.keys()).filter(Boolean)
  if (!ids.length) return []
  const [items, closed, lines] = await Promise.all([
    tx.item.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, quantity: true, displayToCustomer: true, status: true, bookableAfter: true } }),
    tx.closedDate.findFirst({ where: { date: { gte: period.start, lte: period.end } }, select: { id: true } }),
    tx.orderItem.findMany({ where: { itemId: { in: ids }, order: overlappingActiveOrders(period, excludeOrderId) }, select: { itemId: true, quantity: true } }),
  ])
  const booked = new Map<string, number>()
  for (const line of lines) {
    if (!line.itemId) continue
    booked.set(line.itemId, (booked.get(line.itemId) || 0) + line.quantity)
  }
  const byId = new Map(items.map(item => [item.id, item]))
  const shortfalls: InventoryShortfall[] = []
  for (const [itemId, quantity] of requested) {
    const item = byId.get(itemId)
    const sellable = !!item && item.displayToCustomer && item.status === 'Available' && !closed
      && (!item.bookableAfter || item.bookableAfter.getTime() <= period.start.getTime())
    const available = sellable ? Math.max(0, item!.quantity - (booked.get(itemId) || 0)) : 0
    if (quantity > available) shortfalls.push({ itemId, name: item?.name || 'An item', requested: quantity, available })
  }
  return shortfalls
}

export function shortfallMessage(shortfall: InventoryShortfall): string {
  return shortfall.available > 0
    ? 'Only ' + shortfall.available + ' of "' + shortfall.name + '" are available for your rental dates (all colors combined). Please adjust the quantity in your cart.'
    : '"' + shortfall.name + '" is no longer available for your rental dates. Please remove it or choose another date.'
}

export interface ExactSlotRequest {
  eventDate: Date
  deliveryTime?: string | null
  pickupTime?: string | null
  defaultCapacity: number
  excludeOrderId?: string | null
}

/**
 * Exact-time capacity counted from live orders (so canceled orders free their slot),
 * with optional per-slot overrides (ExactTimeSlot.isBlocked / capacity).
 * Returns the first slot type that cannot be booked, or null when both are free.
 */
export async function exactSlotConflict(tx: Tx, request: ExactSlotRequest): Promise<'delivery' | 'pickup' | null> {
  const day: RentalPeriod = { start: startOfDay(request.eventDate), end: endOfDay(request.eventDate) }
  const checks: Array<['delivery' | 'pickup', string]> = []
  if (request.deliveryTime) checks.push(['delivery', request.deliveryTime])
  if (request.pickupTime) checks.push(['pickup', request.pickupTime])
  for (const [type, time] of checks) {
    const override = await tx.exactTimeSlot.findFirst({ where: { date: { gte: day.start, lte: day.end }, time, type }, select: { isBlocked: true, capacity: true } })
    if (override?.isBlocked) return type
    const capacity = override ? override.capacity : request.defaultCapacity
    const taken = await tx.order.count({
      where: {
        ...(request.excludeOrderId ? { id: { not: request.excludeOrderId } } : {}),
        status: { notIn: INACTIVE_STATUSES },
        eventDate: { gte: day.start, lte: day.end },
        AND: [
          holdsStockWhere(),
          type === 'delivery' ? { exactDeliveryRequested: true, exactDeliveryTime: time } : { pickupType: 'exact', exactPickupTime: time },
        ],
      },
    })
    if (taken >= capacity) return type
  }
  return null
}
