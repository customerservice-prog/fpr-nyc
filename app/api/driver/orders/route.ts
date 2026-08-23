export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyDriverToken, DRIVER_COOKIE_NAME } from '@/lib/driverAuth'

function getDriverId(request: NextRequest): string | null {
    const token = request.cookies.get(DRIVER_COOKIE_NAME)?.value
    return verifyDriverToken(token)
}

export async function GET(request: NextRequest) {
    const driverId = getDriverId(request)
    if (!driverId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

  const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get('date')
    const day = dateParam ? new Date(dateParam + 'T00:00:00') : new Date()
    const start = new Date(day)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)

  const driver = await prisma.driver.findUnique({ where: { id: driverId } })
    if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 })

  const orders = await prisma.order.findMany({
        where: {
                eventDate: { gte: start, lt: end },
                status: { notIn: ['cancelled', 'canceled', 'quote'] },
                OR: [
                  { driverId: null },
                  { driverId },
                  { pickupDriverId: null },
                  { pickupDriverId: driverId },
                        ],
        },
        include: {
                customer: true,
                items: { select: { itemName: true, quantity: true } },
        },
        orderBy: [{ routeSequence: 'asc' }, { eventDate: 'asc' }],
  })

  const stops = orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        eventAddress: o.eventAddress,
        eventCity: o.eventCity,
        eventState: o.eventState,
        eventZip: o.eventZip,
        eventTimeSlot: o.eventTimeSlot,
        pickupTimeSlot: o.pickupTimeSlot,
        customerName: `${o.customer.firstName} ${o.customer.lastName}`,
        customerPhone: o.customer.phone,
        totalAmount: o.totalAmount,
        amountPaid: o.amountPaid,
        balanceDue: Math.max(o.totalAmount - o.amountPaid, 0),
        items: o.items.map((i) => ({ itemName: i.itemName, quantity: i.quantity })),
        isDelivery: o.driverId === driverId || o.driverId === null,
        isPickup: o.pickupDriverId === driverId || o.pickupDriverId === null,
        routeSequence: o.driverId === driverId ? o.routeSequence : null,
        pickupRouteSequence: o.pickupDriverId === driverId ? o.pickupRouteSequence : null,
        deliveredAt: o.deliveredAt,
        pickedUpAt: o.pickedUpAt,
        deliveryPhoto: o.deliveryPhoto,
        pickupPhoto: o.pickupPhoto,
        notes: o.notes,
  }))

  return NextResponse.json({ driver: { id: driver.id, name: driver.name }, date: start.toISOString().split('T')[0], stops })
}

export async function PATCH(request: NextRequest) {
    const driverId = getDriverId(request)
    if (!driverId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
    const { orderId, action, photo } = body
    if (!orderId || !action) {
          return NextResponse.json({ error: 'orderId and action are required' }, { status: 400 })
    }

  const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const deliveryMatches = order.driverId === driverId || order.driverId === null
    const pickupMatches = order.pickupDriverId === driverId || order.pickupDriverId === null
    if (!deliveryMatches && !pickupMatches) {
          return NextResponse.json({ error: 'Not assigned to this order' }, { status: 403 })
    }

  const data: Record<string, unknown> = {}
      if (action === 'delivered' && deliveryMatches) {
            data.deliveredAt = new Date()
            if (typeof photo === 'string' && photo) data.deliveryPhoto = photo
      }
    if (action === 'pickedUp' && pickupMatches) {
          data.pickedUpAt = new Date()
          if (typeof photo === 'string' && photo) data.pickupPhoto = photo
    }
    if (Object.keys(data).length === 0) {
          return NextResponse.json({ error: 'Invalid action for this driver' }, { status: 400 })
    }

  const updated = await prisma.order.update({ where: { id: orderId }, data })
    return NextResponse.json({ order: updated })
}
