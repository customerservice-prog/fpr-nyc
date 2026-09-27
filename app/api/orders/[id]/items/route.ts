export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getItemAvailability } from '@/lib/availability'

// "tables_tents" and "bounce_waterslide" categories can carry special multi-day
// duration pricing tiers. For single-day quotes (the vast majority - rentalDays
// defaults to 1) that pricing is identical to a flat per-day rate, so those items
// are safe to add here. We only hold back NEW additions of these categories when
// the order is already a multi-day rental, since this endpoint doesn't re-run the
// duration-tier pricing logic. Existing quantities can always be adjusted/removed.
const RESTRICTED_PRICING_PROFILES = ['tables_tents', 'bounce_waterslide']

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  })

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (order.status !== 'quote') {
    return NextResponse.json(
      { error: 'This order is already booked. Please call 315-884-1498 to make changes.' },
      { status: 403 }
    )
  }

  if (order.items.some((i) => !i.itemId)) {
    return NextResponse.json(
      { error: 'This quote cannot be edited online. Please call 315-884-1498 to make changes.' },
      { status: 403 }
    )
  }

  const body = await request.json()
  const requested: { itemId: string; quantity: number }[] = Array.isArray(body.items) ? body.items : []

  const existingCatalogIds = new Set(order.items.map((i) => i.itemId).filter(Boolean) as string[])

  const cleaned: { itemId: string; quantity: number }[] = []
  for (const entry of requested) {
    const itemId = typeof entry?.itemId === 'string' ? entry.itemId : null
    const quantity = Math.max(0, Math.floor(Number(entry?.quantity) || 0))
    if (!itemId || quantity <= 0) continue
    cleaned.push({ itemId, quantity })
  }

  if (cleaned.length === 0) {
    return NextResponse.json({ error: 'Your quote must have at least one item.' }, { status: 400 })
  }

  const catalogItems = await prisma.item.findMany({
    where: { id: { in: cleaned.map((c) => c.itemId) } },
    include: { category: { select: { pricingProfile: true } } },
  })
  const catalogMap = new Map(catalogItems.map((i) => [i.id, i]))

  for (const { itemId, quantity } of cleaned) {
    const catalogItem = catalogMap.get(itemId)
    if (!catalogItem || !catalogItem.displayToCustomer || catalogItem.status !== 'Available') {
      return NextResponse.json(
        { error: 'One of the requested items is no longer available. Please call 315-884-1498.' },
        { status: 400 }
      )
    }
    const restricted = order.rentalDays > 1 && RESTRICTED_PRICING_PROFILES.includes(catalogItem.category?.pricingProfile || '')
    if (restricted && !existingCatalogIds.has(itemId)) {
      return NextResponse.json(
        { error: `${catalogItem.name} requires staff review for multi-day rentals. Please call 315-884-1498 to add it to your quote.` },
        { status: 400 }
      )
    }
    const alreadyOnOrder = order.items.find((i) => i.itemId === itemId)?.quantity || 0
    if (quantity > alreadyOnOrder) {
      const available = await getItemAvailability(itemId, order.eventDate)
      if (quantity > available) {
        return NextResponse.json(
          { error: `Sorry, only ${available} of ${catalogItem.name} available for this date.` },
          { status: 400 }
        )
      }
    }
  }

  const subtotal = cleaned.reduce((sum, c) => sum + c.quantity * catalogMap.get(c.itemId)!.cost, 0)
  const taxableSubtotal = cleaned.reduce((sum, c) => {
    const item = catalogMap.get(c.itemId)!
    return sum + (item.taxable ? c.quantity * item.cost : 0)
  }, 0)
    const taxAmount = Math.round(taxableSubtotal * (order.taxRate / 100) * 100) / 100
  const totalAmount =
    Math.round(
      (Math.max(subtotal - order.couponDiscount, 0) +
        order.deliveryFee +
        taxAmount +
        order.damageWaiverFee +
        order.specialRequestFee +
        order.durationFee +
        order.tipAmount) *
        100
    ) / 100
  const balanceDue = Math.round((totalAmount - order.amountPaid) * 100) / 100

  await prisma.$transaction([
    prisma.orderItem.deleteMany({ where: { orderId: order.id } }),
    prisma.orderItem.createMany({
      data: cleaned.map((c) => {
        const item = catalogMap.get(c.itemId)!
        return {
          orderId: order.id,
          itemId: item.id,
          itemName: item.name,
          quantity: c.quantity,
          unitPrice: item.cost,
          total: Math.round(c.quantity * item.cost * 100) / 100,
        }
      }),
    }),
    prisma.order.update({
      where: { id: order.id },
      data: {
        subtotal: Math.round(subtotal * 100) / 100,
        taxAmount,
        totalAmount,
        balanceDue,
        internalNotes: `${order.internalNotes ? order.internalNotes + '\n' : ''}Customer updated items on their own quote via self-service link (${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}).`,
      },
    }),
  ])

  return NextResponse.json({ success: true })
}
