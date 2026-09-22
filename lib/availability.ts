import { prisma } from './prisma'
import { startOfDay, endOfDay } from 'date-fns'
import type { Prisma } from '@prisma/client'

// Quote-status orders normally don't count against availability (so stale/abandoned
// staff quotes don't lock up inventory forever). However, EVERY online checkout also
// sits in 'quote' status from order creation until payment is confirmed. To close the
// double-booking gap we still count quote-status orders created within this window as
// reserved (in-progress checkouts), while older truly-abandoned quotes fall out.
const RECENT_QUOTE_WINDOW_MS = 2 * 60 * 60 * 1000 // 2 hours

// Minimal field set returned to the public storefront. Crucially this trims the
// category relation down to the few fields the UI actually uses (name/slug/pricingProfile),
// instead of pulling the category's full base64 image onto every single item, which
// previously bloated the items API payload to hundreds of MB and made pages load slowly.
export const PUBLIC_ITEM_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  type: true,
  cost: true,
  quantity: true,
  // picture: true,
  displayToCustomer: true,
  scheduleProfile: true,
  categoryId: true,
  status: true,
  bookableAfter: true,
  bookableAfterMessage: true,
  specialDisplayName: true,
  setupArea: true,
  attendants: true,
  ageGroup: true,
  // additionalImages: true,
  colorOptions: true,
  taxable: true,
  setupFee: true,
  suggestedAddonIds: true,
  updatedAt: true,
  category: {
    select: { id: true, name: true, slug: true, pricingProfile: true },
  },
} satisfies Prisma.ItemSelect

// Attaches a lightweight, on-demand category image URL (served by the existing
// /api/category-image/[slug] proxy route) without pulling the category's heavy
// base64 picture data into this payload. This is what lets category tiles in the
// order-builder show real photos again without reintroducing the payload-size
// regression PUBLIC_ITEM_SELECT was trimmed down to fix.
export function withCategoryImage<T extends { category: { slug: string } | null }>(item: T) {
  return {
    ...item,
    category: item.category ? { ...item.category, picture: `/api/category-image/${item.category.slug}` } : null,
  }
}

export async function getItemAvailability(itemId: string, date: Date): Promise<number> {
  const item = await prisma.item.findUnique({ where: { id: itemId } })
  if (!item) return 0

if (item.bookableAfter && date < item.bookableAfter) return 0

const dayStart = startOfDay(date)
  const dayEnd = endOfDay(date)

const closedDate = await prisma.closedDate.findFirst({
  where: { date: { gte: dayStart, lte: dayEnd } },
})
  if (closedDate) return 0

const recentQuoteCutoff = new Date(Date.now() - RECENT_QUOTE_WINDOW_MS)

const orders = await prisma.order.findMany({
  where: {
    eventDate: { gte: dayStart, lte: dayEnd },
    status: { notIn: ['canceled', 'cancelled', 'draft', 'incomplete'] },
    OR: [
      { status: { not: 'quote' } },
      { status: 'quote', createdAt: { gte: recentQuoteCutoff } },
      ],
  },
  include: { items: { where: { itemId } } },
})

let booked = 0
  for (const order of orders) {
    for (const orderItem of order.items) {
      booked += orderItem.quantity
    }
  }

return Math.max(0, item.quantity - booked)
}

export async function getItemsWithAvailability(
  date: Date,
  categorySlug?: string,
  search?: string
  ) {
  const where: Record<string, unknown> = { displayToCustomer: true }
  if (categorySlug) where.category = { slug: categorySlug }
  if (search) where.name = { contains: search, mode: 'insensitive' }

const dayStart = startOfDay(date)
  const dayEnd = endOfDay(date)

// Fetch items (trimmed payload) and the day's blocking data in parallel.
const [items, closedDate] = await Promise.all([
  prisma.item.findMany({ where, select: PUBLIC_ITEM_SELECT, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
  prisma.closedDate.findFirst({ where: { date: { gte: dayStart, lte: dayEnd } } }),
  ])

// If the whole day is closed, nothing is available.
if (closedDate) {
  return items.map((item) => withCategoryImage({ ...item, available: 0 }))
}

// Batch: pull ALL relevant order lines for this day in ONE query instead of
// running 3 queries per item (the previous N+1 pattern). Then tally booked
// quantities per item in memory.
const recentQuoteCutoff = new Date(Date.now() - RECENT_QUOTE_WINDOW_MS)
  const orderItems = await prisma.orderItem.findMany({
    where: {
      itemId: { not: null },
      order: {
        eventDate: { gte: dayStart, lte: dayEnd },
        status: { notIn: ['canceled', 'cancelled', 'draft', 'incomplete'] },
        OR: [
          { status: { not: 'quote' } },
          { status: 'quote', createdAt: { gte: recentQuoteCutoff } },
          ],
      },
    },
    select: { itemId: true, quantity: true },
  })

const bookedMap = new Map<string, number>()
  for (const oi of orderItems) {
    if (!oi.itemId) continue
    bookedMap.set(oi.itemId, (bookedMap.get(oi.itemId) || 0) + oi.quantity)
  }

return items.map((item) => {
  if (item.bookableAfter && date < item.bookableAfter) {
    return withCategoryImage({ ...item, available: 0 })
  }
  const booked = bookedMap.get(item.id) || 0
  return withCategoryImage({ ...item, available: Math.max(0, item.quantity - booked) })
})
}

export async function isDateClosed(date: Date): Promise<boolean> {
  const dayStart = startOfDay(date)
  const dayEnd = endOfDay(date)
  const closed = await prisma.closedDate.findFirst({
    where: { date: { gte: dayStart, lte: dayEnd } },
  })
  return !!closed
}
