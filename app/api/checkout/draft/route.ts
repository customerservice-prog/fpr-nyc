export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getNextOrderNumber } from '@/lib/orderNumber'
import { evaluateRentalRestrictions } from '@/lib/rentalRestrictions'
import { DeliveryQuoteError, getDeliveryQuote, requireDeliveryMethod } from '@/lib/delivery'
import { effectiveEventEndDate } from '@/lib/orderDates'

function clean(value: unknown, max = 255) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}
function validDraftKey(value: unknown) {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{12,128}$/.test(value)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    requireDeliveryMethod(body?.deliveryType)
    const checkoutDraftKey = body.checkoutDraftKey
    const firstName = clean(body.firstName, 100)
    const lastName = clean(body.lastName, 100)
    const email = clean(body.email, 254).toLowerCase()
    const phone = clean(body.phone, 60)
    const eventAddress = clean(body.eventAddress)
    const eventCity = clean(body.eventCity, 120)
    const eventState = clean(body.eventState, 20) || 'NY'
    const eventZip = clean(body.eventZip, 20)
    const items = Array.isArray(body.items) ? body.items.filter((i: any) => i?.id && Number(i.quantity) > 0) : []
    const eventDate = new Date(body.eventDate)

    if (!validDraftKey(checkoutDraftKey) || !firstName || !lastName || !email || !phone || !eventAddress || !eventCity || !/^\d{5}$/.test(eventZip) || !items.length || !Number.isFinite(eventDate.getTime())) {
      return NextResponse.json({ error: 'Incomplete checkout details' }, { status: 400 })
    }

    const existing = await prisma.order.findUnique({ where: { checkoutDraftKey }, include: { customer: true } })
    if (existing && existing.status !== 'incomplete') {
      return NextResponse.json({ ok: true, orderId: existing.id, orderNumber: existing.orderNumber, status: existing.status })
    }

    const matchedCustomer = existing?.customer || await prisma.customer.findFirst({
      where: { OR: [{ email: { equals: email, mode: 'insensitive' } }, { phone }] },
    })
    const restriction = await evaluateRentalRestrictions({
      customerId: matchedCustomer?.id || null,
      emails: [email], phones: [phone],
      address: { street1: eventAddress, city: eventCity, state: eventState, zip: eventZip },
    })
    if (restriction.matched) return NextResponse.json({ requiresAssistance: true }, { status: 200 })

    const deliveryQuote = await getDeliveryQuote(eventZip)
    const customer = matchedCustomer
      ? await prisma.customer.update({
          where: { id: matchedCustomer.id },
          data: { firstName, lastName, email, phone, address: eventAddress, city: eventCity, state: eventState, zip: eventZip },
        })
      : await prisma.customer.create({
          data: { firstName, lastName, email, phone, address: eventAddress, city: eventCity, state: eventState, zip: eventZip },
        })

    const subtotal = Math.max(Number(body.subtotal) || 0, 0)
    const totalAmount = Math.max(Number(body.totalAmount) || subtotal + deliveryQuote.fee, 0)
    const depositAmount = Math.max(Number(body.depositAmount) || 0, 0)
    const stage = ['details_completed','payment_page','payment_started'].includes(body.stage) ? body.stage : 'details_completed'
    const rentalDayCount = Math.max(Number(body.rentalDays) || 1, 1)
    const data: any = {
      customerId: customer.id, status: 'incomplete', source: 'online',
      checkoutStage: stage, checkoutLastSeenAt: new Date(),
      eventDate, eventEndDate: effectiveEventEndDate(eventDate, null, rentalDayCount), eventAddress, eventCity, eventState, eventZip,
      eventTimeSlot: clean(body.eventTimeSlot, 160) || null,
      pickupTimeSlot: clean(body.pickupTimeSlot, 160) || null,
      deliveryType: 'delivery', deliveryFee: deliveryQuote.fee, deliveryDistance: deliveryQuote.distance,
      subtotal, rentalDays: rentalDayCount,
      durationLabel: clean(body.durationLabel, 120) || null,
      durationFee: Math.max(Number(body.durationFee) || 0, 0),
      specialRequestFee: Math.max(Number(body.specialRequestFee) || 0, 0),
      specialRequestNames: clean(body.specialRequestNames, 500) || null,
      taxRate: Math.max(Number(body.taxRate) || 0, 0),
      taxAmount: Math.max(Number(body.taxAmount) || 0, 0),
      couponCode: clean(body.couponCode, 80) || null,
      couponDiscount: Math.max(Number(body.couponDiscount) || 0, 0),
      damageWaiver: !!body.damageWaiver,
      damageWaiverFee: Math.max(Number(body.damageWaiverFee) || 0, 0),
      lastMinuteFeeAmount: Math.max(Number(body.lastMinuteFeeAmount) || 0, 0),
      totalAmount, depositAmount, amountPaid: 0, balanceDue: totalAmount,
      tipAmount: Math.max(Number(body.tipAmount) || 0, 0),
      notes: clean(body.notes, 4000) || null,
      eventStartTime: clean(body.schedulingDetails?.eventStartTime, 20) || null,
      eventEndTime: clean(body.schedulingDetails?.eventEndTime, 20) || null,
      deliveryWindowStart: clean(body.schedulingDetails?.deliveryWindowStart, 20) || null,
      deliveryWindowEnd: clean(body.schedulingDetails?.deliveryWindowEnd, 20) || null,
      exactDeliveryRequested: !!body.schedulingDetails?.exactDeliveryRequested,
      exactDeliveryTime: clean(body.schedulingDetails?.exactDeliveryTime, 20) || null,
      exactDeliveryFee: Math.max(Number(body.schedulingDetails?.exactDeliveryFee) || 0, 0),
      pickupType: clean(body.schedulingDetails?.pickupType, 30) || 'flexible',
      pickupRequiredByTime: clean(body.schedulingDetails?.pickupRequiredByTime, 20) || null,
      exactPickupTime: clean(body.schedulingDetails?.exactPickupTime, 20) || null,
      exactPickupFee: Math.max(Number(body.schedulingDetails?.exactPickupFee) || 0, 0),
      latePickupApprovalRequired: !!body.schedulingDetails?.latePickupApprovalRequired,
      items: {
        deleteMany: {},
        create: items.map((item: any) => ({
          itemId: item.id, itemName: clean(item.name, 240),
          quantity: Math.max(Math.floor(Number(item.quantity) || 1), 1),
          unitPrice: Math.max(Number(item.unitPrice ?? item.price) || 0, 0),
          total: Math.max(Number(item.unitPrice ?? item.price) || 0, 0) * Math.max(Math.floor(Number(item.quantity) || 1), 1),
        })),
      },
    }

    const order = existing
      ? await prisma.order.update({ where: { id: existing.id }, data, include: { items: true } })
      : await prisma.order.create({ data: { ...data, checkoutDraftKey, orderNumber: await getNextOrderNumber() }, include: { items: true } })

    return NextResponse.json({ ok: true, orderId: order.id, orderNumber: order.orderNumber, status: order.status, stage: order.checkoutStage })
  } catch (error) {
    if (error instanceof DeliveryQuoteError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('Checkout draft error:', error)
    return NextResponse.json({ error: 'Could not save checkout progress' }, { status: 500 })
  }
}
