export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth } from 'date-fns'; function getZonedDayRange(date: Date, timeZone: string) { const parts: any = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date).reduce((acc: any, p) => { if (p.type !== 'literal') acc[p.type] = p.value; return acc }, {}); const guess = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`); const asTz = new Date(guess.toLocaleString('en-US', { timeZone })); const asUtc = new Date(guess.toLocaleString('en-US', { timeZone: 'UTC' })); const offsetMs = asTz.getTime() - asUtc.getTime(); const dayStart = new Date(guess.getTime() - offsetMs); const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1); return { dayStart, dayEnd } }

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date(); let companyTimeZone = 'America/New_York'; try { const companySettings = await prisma.companySettings.findFirst(); if (companySettings?.timeZone) companyTimeZone = companySettings.timeZone } catch {}
    const { dayStart, dayEnd } = getZonedDayRange(today, companyTimeZone)
    

  const { searchParams } = request.nextUrl
    const monthParam = searchParams.get('month')
    const yearParam = searchParams.get('year')
    const refDate = monthParam !== null && yearParam !== null
      ? new Date(parseInt(yearParam), parseInt(monthParam), 1)
          : today
    const rangeStart = startOfMonth(refDate)
    const rangeEnd = endOfMonth(refDate)

  const collectedToday = await prisma.payment.aggregate({
                where: { createdAt: { gte: dayStart, lte: dayEnd }, OR: [{ recordedByName: null }, { NOT: { recordedByName: { contains: 'historical backfill', mode: 'insensitive' } } }] },
        _sum: { amount: true },
  })

  const inventoryCount = await prisma.item.count({
        where: { cost: { gte: 65 }, displayToCustomer: true },
  })

  const calendarOrdersRaw = await prisma.order.findMany({
        where: {
                eventDate: { gte: rangeStart, lte: rangeEnd },
                                status: { notIn: ['canceled', 'quote'] },
                                OR: [
                                        { amountPaid: { gt: 0 } },
                                        { scheduleApprovedUnpaid: true },
                                ],
        },
        include: {
                customer: {
                  // constrained select: avoid reading `unsubscribed` column
                  // (may not exist in prod until prisma db push is run)
                  select: {
                    id: true, firstName: true, lastName: true, email: true, phone: true,
                    company: true, secondaryPhone: true, secondaryEmail: true,
                    customerType: true, address: true, city: true, state: true, zip: true,
                    notes: true, creditStatus: true, createdAt: true, updatedAt: true,
                  },
                },
                items: true,
        },
        orderBy: { eventDate: 'asc' },
  })

const calendarOrders = calendarOrdersRaw.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        deliveryType: o.deliveryType,
        customerName: `${o.customer.firstName} ${o.customer.lastName}`,
        customerPhone: o.customer.phone,
        customerEmail: o.customer.email,
        eventDate: o.eventDate.toISOString(),
        eventEndDate: o.eventEndDate?.toISOString() || null,
        eventTimeSlot: o.eventTimeSlot,
        pickupTimeSlot: o.pickupTimeSlot,
        eventAddress: o.eventAddress,
        eventCity: o.eventCity,
        eventState: o.eventState,
        eventZip: o.eventZip,
        subtotal: o.subtotal,
        deliveryFee: o.deliveryFee,
        taxAmount: o.taxAmount,
        damageWaiver: o.damageWaiver,
        damageWaiverFee: o.damageWaiverFee,
        depositAmount: o.depositAmount,
        tipAmount: o.tipAmount,
        totalAmount: o.totalAmount,
        amountPaid: o.amountPaid,
        balanceDue: o.balanceDue,
        notes: o.notes,
    internalNotes: o.internalNotes,
    couponCode: o.couponCode,
    couponDiscount: o.couponDiscount,
        items: o.items.map((it) => ({ id: it.id, itemName: it.itemName, quantity: it.quantity, unitPrice: it.unitPrice, total: it.total })),
    }))

  const closedDates = await prisma.closedDate.findMany()
    const tasks = await prisma.task.findMany({ orderBy: { createdAt: 'desc' }, take: 10 })

  return NextResponse.json({
        collectedToday: collectedToday._sum.amount || 0,
        inventoryCount,
        calendarOrders,
        closedDates: closedDates.map((d) => d.date.toISOString()),
        tasks,
  })
}
