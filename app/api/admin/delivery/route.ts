export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const dateParam = searchParams.get('date')
  const type = searchParams.get('type') || 'all'
  const statusFilter = searchParams.get('status') || 'active'
  const driverIdFilter = searchParams.get('driverId') || ''

  const day = dateParam ? new Date(dateParam + 'T00:00:00') : new Date()
  const start = new Date(day)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  const where: Record<string, unknown> = {
    eventDate: { gte: start, lt: end },
  }

  if (statusFilter === 'cancelled') {
    where.status = { in: ['cancelled', 'canceled'] }
  } else if (statusFilter === 'all') {
    // no status filter
  } else {
    where.status = { notIn: ['cancelled', 'canceled', 'quote'] }
  }

  if (type === 'delivery' || type === 'pickup') {
    where.deliveryType = type
  }

  if (driverIdFilter) {
    where.OR = [{ driverId: driverIdFilter }, { pickupDriverId: driverIdFilter }]
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      customer: true, contacts: true,
      items: { select: { itemName: true, quantity: true } },
      driver: true,
      pickupDriver: true,
    },
    orderBy: [{ routeSequence: 'asc' }, { eventDate: 'asc' }],
  })

  const result = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    deliveryType: o.deliveryType,
    eventDate: o.eventDate,
    eventTimeSlot: o.eventTimeSlot,
    eventAddress: o.eventAddress,
    eventCity: o.eventCity,
    eventState: o.eventState,
    eventZip: o.eventZip,
    balanceDue: o.balanceDue,
    totalAmount: o.totalAmount, amountPaid: o.amountPaid,
    driverId: o.driverId,
    driverName: o.driver?.name || null,
    pickupDriverId: o.pickupDriverId,
    pickupDriverName: o.pickupDriver?.name || null,
    routeSequence: o.routeSequence,
    pickupRouteSequence: o.pickupRouteSequence,
    eventEndDate: o.eventEndDate,
    notes: o.notes,
    contractSignedAt: o.contractSignedAt,
    setupSurface: o.setupSurface,
    isPublicPark: o.isPublicPark,
    dayOfContact: (() => { const d = (o.contacts || []).find((c: any) => c.role === 'Day-Of'); return d ? { name: d.name, phone: d.phone, note: d.note } : null })(), customer: {
      firstName: o.customer.firstName,
      lastName: o.customer.lastName,
      phone: o.customer.phone,
    },
    deliveredAt: o.deliveredAt,
    pickedUpAt: o.pickedUpAt,
    items: o.items.map((i) => ({ itemName: i.itemName, quantity: i.quantity })),
  }))

  const deliveryCount = result.filter((o) => o.deliveryType === 'delivery').length
  const pickupCount = result.filter((o) => o.deliveryType === 'pickup').length

  const pickupWhere: Record<string, unknown> = {
    eventEndDate: { gte: start, lt: end },
    NOT: { eventDate: { gte: start, lt: end } },
  }
  if (statusFilter === 'cancelled') {
    pickupWhere.status = { in: ['cancelled', 'canceled'] }
  } else if (statusFilter === 'all') {
  } else {
    pickupWhere.status = { notIn: ['cancelled', 'canceled', 'quote'] }
  }
  if (driverIdFilter) {
    pickupWhere.OR = [{ driverId: driverIdFilter }, { pickupDriverId: driverIdFilter }]
  }
  const pickupOrdersRaw = await prisma.order.findMany({
    where: pickupWhere,
    include: {
      customer: true, contacts: true,
      items: { select: { itemName: true, quantity: true } },
      driver: true,
      pickupDriver: true,
    },
    orderBy: [{ pickupRouteSequence: 'asc' }, { eventEndDate: 'asc' }],
  })
  const pickupResult = pickupOrdersRaw.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    deliveryType: o.deliveryType,
    eventDate: o.eventDate,
    pickupTimeSlot: o.pickupTimeSlot,
    eventTimeSlot: o.eventTimeSlot,
    eventAddress: o.eventAddress,
    eventCity: o.eventCity,
    eventState: o.eventState,
    eventZip: o.eventZip,
    balanceDue: o.balanceDue,
    totalAmount: o.totalAmount, amountPaid: o.amountPaid,
    driverId: o.driverId,
    driverName: o.driver?.name || null,
    pickupDriverId: o.pickupDriverId,
    pickupDriverName: o.pickupDriver?.name || null,
    routeSequence: o.routeSequence,
    pickupRouteSequence: o.pickupRouteSequence,
    eventEndDate: o.eventEndDate,
    notes: o.notes,
    contractSignedAt: o.contractSignedAt,
    setupSurface: o.setupSurface,
    isPublicPark: o.isPublicPark,
    dayOfContact: (() => { const d = (o.contacts || []).find((c: any) => c.role === 'Day-Of'); return d ? { name: d.name, phone: d.phone, note: d.note } : null })(), customer: {
      firstName: o.customer.firstName,
      lastName: o.customer.lastName,
      phone: o.customer.phone,
    },
    deliveredAt: o.deliveredAt,
    pickedUpAt: o.pickedUpAt,
    items: o.items.map((i) => ({ itemName: i.itemName, quantity: i.quantity })),
  }))

  return NextResponse.json({
    date: start.toISOString().split('T')[0],
    orders: result,
    deliveryCount,
    pickupCount,
    total: result.length,
    pickups: pickupResult,
    pickupsTodayCount: pickupResult.length,
  })
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { orderId, driverId, pickupDriverId, routeSequence, pickupRouteSequence, deliveredAt, pickedUpAt } = body
  if (!orderId) {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (driverId !== undefined) data.driverId = driverId || null
  if (pickupDriverId !== undefined) data.pickupDriverId = pickupDriverId || null
  if (routeSequence !== undefined) data.routeSequence = routeSequence
  if (pickupRouteSequence !== undefined) data.pickupRouteSequence = pickupRouteSequence; if (deliveredAt !== undefined) data.deliveredAt = deliveredAt ? new Date(deliveredAt) : null; if (pickedUpAt !== undefined) data.pickedUpAt = pickedUpAt ? new Date(pickedUpAt) : null

  const order = await prisma.order.update({
    where: { id: orderId },
    data,
  })
  return NextResponse.json({ order })
}
