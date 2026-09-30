export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getNextOrderNumber } from '@/lib/orderNumber'
import { evaluateRentalRestrictions } from '@/lib/rentalRestrictions'
import { DeliveryQuoteError, getDeliveryQuote, requireDeliveryMethod } from '@/lib/delivery'
import { effectiveEventEndDate } from '@/lib/orderDates'
import { CheckoutPricingError, NYC_PRICING_VERSION, checkoutLineName, toCents, type CheckoutPricingResult } from '@/lib/nycCheckoutPricing'
import { priceNycCheckout } from '@/lib/nycCheckoutPricingServer'
import { lockNycCapacity } from '@/lib/nycInventory'

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

    // Rental-restriction checks match by email OR phone; the customer record itself
    // is only ever linked by email and is never overwritten from this public form.
    const restrictionCustomer = await prisma.customer.findFirst({
      where: { OR: [{ email: { equals: email, mode: 'insensitive' } }, { phone }] },
      select: { id: true },
    })
    const restriction = await evaluateRentalRestrictions({
      customerId: restrictionCustomer?.id || null,
      emails: [email], phones: [phone],
      address: { street1: eventAddress, city: eventCity, state: eventState, zip: eventZip },
    })
    if (restriction.matched) return NextResponse.json({ requiresAssistance: true }, { status: 200 })

    const deliveryQuote = await getDeliveryQuote(eventZip)
    const sameEmail = (value: string | null | undefined) => typeof value === 'string' && value.trim().toLowerCase() === email
    const emailCustomer = existing?.customer && sameEmail(existing.customer.email)
      ? existing.customer
      : await prisma.customer.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, orderBy: { createdAt: 'asc' } })
    const customer = emailCustomer
      // Existing customer: only fill in details that are still blank.
      ? await prisma.customer.update({
          where: { id: emailCustomer.id },
          data: {
            ...(emailCustomer.phone ? {} : { phone }),
            ...(emailCustomer.address ? {} : { address: eventAddress, city: eventCity, state: eventState, zip: eventZip }),
          },
        })
      : await prisma.customer.create({
          data: { firstName, lastName, email, phone, address: eventAddress, city: eventCity, state: eventState, zip: eventZip },
        })

    // Drafts only record checkout progress. Their totals are ALWAYS computed on the
    // server; browser-supplied amounts are never stored. If pricing cannot be computed
    // yet (e.g. tax or deposit rules not configured) the draft is saved without
    // server pricing and cannot be charged online.
    let pricing: CheckoutPricingResult | null = null
    try {
      pricing = await priceNycCheckout(body)
    } catch (error) {
      if (!(error instanceof CheckoutPricingError) && !(error instanceof DeliveryQuoteError)) throw error
    }
    const subtotal = pricing ? pricing.adjustedSubtotal : 0
    const totalAmount = pricing ? Math.round(pricing.totalWithTip * 100) / 100 : 0
    const requestedPrincipal = Number(body.depositAmount)
    const depositAmount = pricing
      ? (Number.isFinite(requestedPrincipal) && toCents(requestedPrincipal) >= toCents(pricing.requiredDeposit) && toCents(requestedPrincipal) <= toCents(pricing.grandTotal) ? Math.round(requestedPrincipal * 100) / 100 : pricing.requiredDeposit)
      : 0
    const catalogRows = await prisma.item.findMany({ where: { id: { in: items.map((item: any) => String(item.id)) } }, select: { id: true, name: true, colorOptions: true } })
    const catalogById = new Map(catalogRows.map(row => [row.id, row]))
    const stage = ['details_completed','payment_page','payment_started'].includes(body.stage) ? body.stage : 'details_completed'
    const rentalDayCount = Math.max(pricing?.rentalDays || 1, 1)
    const data: any = {
      customerId: customer.id, status: 'incomplete', source: 'online',
      checkoutStage: stage, checkoutLastSeenAt: new Date(),
      eventDate, eventEndDate: effectiveEventEndDate(eventDate, null, rentalDayCount), eventAddress, eventCity, eventState, eventZip,
      eventTimeSlot: clean(body.eventTimeSlot, 160) || null,
      pickupTimeSlot: clean(body.pickupTimeSlot, 160) || null,
      deliveryType: 'delivery', deliveryFee: deliveryQuote.fee, deliveryDistance: deliveryQuote.distance,
      subtotal, rentalDays: rentalDayCount,
      durationLabel: pricing?.durationLabel || null,
      durationFee: pricing?.durationFee || 0,
      specialRequestFee: pricing?.specialRequestFee || 0,
      specialRequestNames: pricing?.specialRequestNames || null,
      taxRate: pricing?.taxRate || 0,
      taxAmount: pricing?.taxAmount || 0,
      couponCode: pricing?.couponCode || null,
      couponDiscount: pricing?.couponDiscount || 0,
      damageWaiver: pricing?.damageWaiver || false,
      damageWaiverFee: pricing?.damageWaiverFee || 0,
      lastMinuteFeeAmount: pricing?.lastMinuteFee || 0,
      totalAmount, depositAmount, amountPaid: 0, balanceDue: totalAmount,
      tipAmount: pricing?.tipAmount || 0,
      pricingVersion: pricing ? NYC_PRICING_VERSION : null,
      notes: clean(body.notes, 4000) || null,
      eventStartTime: clean(body.schedulingDetails?.eventStartTime, 20) || null,
      eventEndTime: clean(body.schedulingDetails?.eventEndTime, 20) || null,
      deliveryWindowStart: clean(body.schedulingDetails?.deliveryWindowStart, 20) || null,
      deliveryWindowEnd: clean(body.schedulingDetails?.deliveryWindowEnd, 20) || null,
      exactDeliveryRequested: !!body.schedulingDetails?.exactDeliveryRequested,
      exactDeliveryTime: clean(body.schedulingDetails?.exactDeliveryTime, 20) || null,
      exactDeliveryFee: pricing?.exactDeliveryFee || 0,
      pickupType: clean(body.schedulingDetails?.pickupType, 30) || 'flexible',
      pickupRequiredByTime: clean(body.schedulingDetails?.pickupRequiredByTime, 20) || null,
      exactPickupTime: clean(body.schedulingDetails?.exactPickupTime, 20) || null,
      exactPickupFee: pricing?.exactPickupFee || 0,
      latePickupApprovalRequired: !!body.schedulingDetails?.latePickupApprovalRequired,
      items: {
        deleteMany: {},
        // Prices come from the server catalog. Without server pricing the lines are
        // stored at $0 so an unpriced draft can never be charged from browser amounts.
        create: items.map((item: any, index: number) => {
          const line = pricing?.lines[index]
          const quantity = Math.max(Math.floor(Number(item.quantity) || 1), 1)
          return {
            itemId: item.id,
            itemName: catalogById.get(String(item.id)) ? checkoutLineName(catalogById.get(String(item.id))!.name, catalogById.get(String(item.id))!.colorOptions, item.name) : clean(item.name, 240),
            quantity,
            unitPrice: line ? line.unitPrice : 0,
            total: line ? line.total : 0,
          }
        }),
      },
    }

    // Under the capacity lock, never turn an order that has meanwhile been submitted
    // for payment back into an incomplete draft.
    const newOrderNumber = existing ? null : await getNextOrderNumber()
    const order = await prisma.$transaction(async (tx) => {
      await lockNycCapacity(tx)
      const current = await tx.order.findUnique({ where: { checkoutDraftKey } })
      if (current && current.status !== 'incomplete') return current
      return current
        ? tx.order.update({ where: { id: current.id }, data })
        : tx.order.create({ data: { ...data, items: { create: data.items.create }, checkoutDraftKey, orderNumber: newOrderNumber || await getNextOrderNumber() } })
    }, { maxWait: 10000, timeout: 20000 })

    return NextResponse.json({ ok: true, orderId: order.id, orderNumber: order.orderNumber, status: order.status, stage: order.checkoutStage })
  } catch (error) {
    if (error instanceof DeliveryQuoteError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('Checkout draft error:', error)
    return NextResponse.json({ error: 'Could not save checkout progress' }, { status: 500 })
  }
}
