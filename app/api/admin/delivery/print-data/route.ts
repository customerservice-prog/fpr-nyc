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

  const day = dateParam ? new Date(dateParam + 'T00:00:00') : new Date()
  const start = new Date(day)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  const orders = await prisma.order.findMany({
    where: {
      eventDate: { gte: start, lt: end },
      status: { notIn: ['cancelled', 'canceled', 'quote'] },
      },
    include: {
      customer: true,
      items: true,
      driver: true,
      pickupDriver: true,
      },
    orderBy: [{ routeSequence: 'asc' }, { eventDate: 'asc' }],
    })

  const result = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    eventDate: o.eventDate,
    eventTimeSlot: o.eventTimeSlot,
    eventAddress: o.eventAddress,
    eventCity: o.eventCity,
    eventState: o.eventState,
    eventZip: o.eventZip,
    deliveryType: o.deliveryType,
    subtotal: o.subtotal,
    damageWaiverFee: o.damageWaiverFee,
    deliveryFee: o.deliveryFee,
    durationFee: o.durationFee,
    specialRequestFee: o.specialRequestFee,
    taxAmount: o.taxAmount,
    couponDiscount: o.couponDiscount,
    tipAmount: o.tipAmount,
    lastMinuteFeeAmount: o.lastMinuteFeeAmount,
    totalAmount: o.totalAmount,
    amountPaid: o.amountPaid,
    balanceDue: o.balanceDue,
    contractSignedAt: o.contractSignedAt,
    contractSignatureName: o.contractSignatureName,
    driverName: o.driver?.name || null,
    pickupDriverName: o.pickupDriver?.name || null,
    customerName: `${o.customer.firstName} ${o.customer.lastName}`,
    customerPhone: o.customer.phone,
    customerEmail: o.customer.email,
    items: o.items.map((i) => ({
      itemName: i.itemName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      total: i.total,
      })),
    }))

  return NextResponse.json({ date: start.toISOString().split('T')[0], orders: result })
  }
