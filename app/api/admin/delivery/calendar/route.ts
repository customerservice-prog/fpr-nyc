export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth } from 'date-fns'

function toDateKey(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const monthParam = searchParams.get('month')
  const yearParam = searchParams.get('year')
  const today = new Date()
  const refDate =
    monthParam !== null && yearParam !== null
      ? new Date(parseInt(yearParam), parseInt(monthParam), 1)
      : new Date(today.getFullYear(), today.getMonth(), 1)

  const rangeStart = startOfMonth(refDate)
  const rangeEnd = endOfMonth(refDate)

  // An order shows a green "Delivery" badge on the day it is dropped off (eventDate),
  // and a red "Pickup" badge on the day it is picked back up (eventEndDate, falling
  // back to eventDate for orders that don't have a separate pickup date). Because an
  // order's delivery and pickup can land in different months, we fetch any order whose
  // delivery OR pickup date falls within the requested range.
  const orders = await prisma.order.findMany({
    where: {
      status: { notIn: ['cancelled', 'canceled', 'quote'] },
      OR: [
        { eventDate: { gte: rangeStart, lte: rangeEnd } },
        { eventEndDate: { gte: rangeStart, lte: rangeEnd } },
      ],
    },
    select: { eventDate: true, eventEndDate: true },
  })

  const closedDates = await prisma.closedDate.findMany({
    where: { date: { gte: rangeStart, lte: rangeEnd } },
  })

  const dayMap: Record<string, { deliveryCount: number; pickupCount: number }> = {}
  const ensureDay = (key: string) => {
    if (!dayMap[key]) dayMap[key] = { deliveryCount: 0, pickupCount: 0 }
    return dayMap[key]
  }

  for (const o of orders) {
    const deliveryDate = new Date(o.eventDate)
    if (deliveryDate >= rangeStart && deliveryDate <= rangeEnd) {
      ensureDay(toDateKey(deliveryDate)).deliveryCount += 1
    }

    const pickupDate = new Date(o.eventEndDate ?? o.eventDate)
    if (pickupDate >= rangeStart && pickupDate <= rangeEnd) {
      ensureDay(toDateKey(pickupDate)).pickupCount += 1
    }
  }

  const days = Object.entries(dayMap).map(([date, counts]) => ({ date, ...counts }))

  return NextResponse.json({
    month: refDate.getMonth(),
    year: refDate.getFullYear(),
    days,
    closedDates: closedDates.map((d) => toDateKey(new Date(d.date))),
  })
}
