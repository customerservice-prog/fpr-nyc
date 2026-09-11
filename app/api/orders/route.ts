export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getNextOrderNumber } from '@/lib/orderNumber'
import { BUSINESS } from '@/lib/utils'
import { sendEmail, newOrderAdminNotificationEmail } from '@/lib/email'
import { getItemAvailability } from '@/lib/availability'
import { evaluateRentalRestrictions } from '@/lib/rentalRestrictions'

async function reserveExactTimeSlot(tx: any, date: Date, time: string, type: 'delivery' | 'pickup', defaultCapacity: number): Promise<{ ok: true } | { ok: false; reason: 'blocked' | 'full' }> {
  const dayDate = new Date(date)
  dayDate.setHours(0, 0, 0, 0)
  const existing = await tx.exactTimeSlot.findUnique({
    where: { date_time_type: { date: dayDate, time, type } },
  })
  if (existing) {
    if (existing.isBlocked) return { ok: false, reason: 'blocked' }
    if (existing.bookedCount >= existing.capacity) return { ok: false, reason: 'full' }
    await tx.exactTimeSlot.update({ where: { id: existing.id }, data: { bookedCount: { increment: 1 } } })
    return { ok: true }
  }
  await tx.exactTimeSlot.create({ data: { date: dayDate, time, type, capacity: defaultCapacity, bookedCount: 1, isBlocked: false } })
  return { ok: true }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      firstName,
      lastName,
      email,
      phone,
      eventDate,
      eventAddress,
      eventCity,
      eventState,
      eventZip,
      eventTimeSlot,
      pickupTimeSlot,
      tipAmount,
      lastMinuteFeeAmount,
      deliveryType,
      notes,
      items,
      subtotal,
      rentalDays,
      durationLabel,
      durationFee,
      specialRequestFee,
      specialRequestNames,
      deliveryFee,
      deliveryDistance,
      taxRate,
      taxAmount,
      couponCode,
      couponDiscount,
      damageWaiver,
      damageWaiverFee,
      totalAmount: totalAmountInput,
      depositAmount,
      schedulingDetails,
    } = body

    if (!firstName || !lastName || !email || !eventDate || !items?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const normalizedPhone = phone ? String(phone).trim() : null

    // --- Rental Restriction ("Do Not Rent") check ---
    // This MUST run before any Customer or Order record is created, and
    // before Stripe is ever contacted, so a blocked attempt can never
    // reserve inventory, create a real customer/order, or reach payment.
    // See lib/rentalRestrictions.ts for the canonical matching logic.
    const existingCustomerForCheck = await prisma.customer.findFirst({
      where: {
        OR: [
          { email: { equals: normalizedEmail, mode: 'insensitive' } },
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
        ],
      },
    })

    const restrictionResult = await evaluateRentalRestrictions({
      customerId: existingCustomerForCheck?.id || null,
      emails: [normalizedEmail],
      phones: [normalizedPhone],
      address: eventAddress ? { street1: eventAddress, city: eventCity, state: eventState, zip: eventZip } : null,
    })

    if (restrictionResult.matched) {
      try {
        await prisma.restrictedCheckoutAttempt.create({
          data: {
            firstName,
            lastName,
            email: normalizedEmail,
            phone: normalizedPhone,
            eventAddress: eventAddress || null,
            eventCity: eventCity || null,
            eventState: eventState || null,
            eventZip: eventZip || null,
            eventDate: new Date(eventDate),
            cartSummary: JSON.stringify({
              items: (items || []).map((i: any) => ({ name: i.name, quantity: i.quantity })),
              subtotal,
            }),
            matchedRestrictionIds: restrictionResult.restrictionIds,
            matchTypes: Array.from(new Set(restrictionResult.matches.map((m) => m.identifierType))),
          },
        })
      } catch (logErr) {
        console.error('Failed to log restricted checkout attempt:', logErr)
      }

      // Deliberately neutral - never reveals why, which field matched, or
      // that a restriction system exists at all.
      return NextResponse.json({
        requiresAssistance: true,
        message: 'We\'re unable to complete this reservation online. Please call ' + BUSINESS.name + ' at ' + BUSINESS.phone + ' so our team can assist with your booking.',
        phone: BUSINESS.phone,
      })
    }

    const hoursUntilEvent = (new Date(eventDate).getTime() - Date.now()) / (1000 * 60 * 60)
    if (hoursUntilEvent < 24) {
      return NextResponse.json({ error: 'Orders cannot be placed within 24 hours of the event date. Please call our office for last-minute availability.' }, { status: 400 })
    }

    // Server-side inventory check: never trust client-side availability math alone.
    // This prevents overbooking/double-booking even if the cart was manipulated
    // or an order is submitted directly via the API.
    for (const requestedItem of items) {
      if (!requestedItem?.id) continue
      const requestedQty = Number(requestedItem.quantity) || 0
      if (requestedQty <= 0) continue
      const available = await getItemAvailability(requestedItem.id, new Date(eventDate))
      if (requestedQty > available) {
        return NextResponse.json({
          error: available > 0
            ? 'Only ' + available + ' of "' + requestedItem.name + '" available for the selected date. Please adjust the quantity in your cart.'
            : '"' + requestedItem.name + '" is no longer available for the selected date. Please remove it or choose another date.',
        }, { status: 400 })
      }
    }

    // Server-side exact-time delivery/pickup capacity check: never trust
    // frontend-only availability for premium exact-time slots. Revalidates
    // and atomically reserves the slot at submission time so two customers
    // can never both be promised the same exact-time slot.
    const wantsExactDelivery = !!schedulingDetails?.exactDeliveryRequested && !!schedulingDetails?.exactDeliveryTime
    const wantsExactPickup = schedulingDetails?.pickupType === 'exact' && !!schedulingDetails?.exactPickupTime

    if (wantsExactDelivery || wantsExactPickup) {
      const exactTimeSettings = await prisma.exactTimeSettings.findFirst()
      const defaultCapacity = exactTimeSettings?.defaultCapacityPerSlot ?? 1
      const exactTimeEnabled = exactTimeSettings?.enabled ?? true

      if (!exactTimeEnabled) {
        return NextResponse.json({ error: 'Exact-time scheduling is currently unavailable. Please choose a standard delivery window or flexible pickup, or call our office for assistance.' }, { status: 400 })
      }

      const slotResult = await prisma.$transaction(async (tx) => {
        if (wantsExactDelivery) {
          const res = await reserveExactTimeSlot(tx, new Date(eventDate), schedulingDetails.exactDeliveryTime, 'delivery', defaultCapacity)
          if (!res.ok) return { ok: false as const, which: 'delivery' as const }
        }
        if (wantsExactPickup) {
          const res = await reserveExactTimeSlot(tx, new Date(eventDate), schedulingDetails.exactPickupTime, 'pickup', defaultCapacity)
          if (!res.ok) return { ok: false as const, which: 'pickup' as const }
        }
        return { ok: true as const }
      })

      if (!slotResult.ok) {
        return NextResponse.json({
          error: 'That exact ' + slotResult.which + ' time was just booked by another customer. Please go back and choose a different time.',
        }, { status: 409 })
      }
    }

    let customer = existingCustomerForCheck
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          firstName,
          lastName,
          email: normalizedEmail,
          phone: normalizedPhone,
          address: eventAddress || null,
          city: eventCity || null,
          state: eventState || 'NY',
          zip: eventZip || null,
        },
      })
    }

    const orderNumber = await getNextOrderNumber()
    const fee = deliveryFee || 0
    const tax = taxAmount || 0
    const discount = couponDiscount || 0
    const waiverFee = damageWaiverFee || 0
    const durationFeeAmount = durationFee || 0
    const specialFee = specialRequestFee || 0
    const lastMinuteFee = lastMinuteFeeAmount || 0
    const exactDeliveryFeeAmount = schedulingDetails?.exactDeliveryFee || 0
    const exactPickupFeeAmount = schedulingDetails?.exactPickupFee || 0
    const schedulingFeeTotal = exactDeliveryFeeAmount + exactPickupFeeAmount
    const baseTotalAmount = typeof totalAmountInput === 'number'
      ? totalAmountInput
      : Math.max(subtotal - discount, 0) + fee + tax + waiverFee + specialFee + lastMinuteFee + schedulingFeeTotal
    const totalAmount = baseTotalAmount + (Number(tipAmount) || 0)

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        status: 'quote',
        eventDate: new Date(eventDate),
        eventAddress: eventAddress || null,
        eventCity: eventCity || null,
        eventState: eventState || 'NY',
        eventZip: eventZip || null,
        eventTimeSlot: eventTimeSlot || null,
        pickupTimeSlot: pickupTimeSlot || null,
        deliveryType: deliveryType || 'delivery',
        deliveryFee: fee,
        deliveryDistance: deliveryDistance ?? null,
        subtotal,
        rentalDays: rentalDays || 1,
        durationLabel: durationLabel || null,
        durationFee: durationFeeAmount,
        specialRequestFee: specialFee,
        specialRequestNames: specialRequestNames || null,
        taxRate: taxRate || 0,
        taxAmount: tax,
        couponCode: couponCode || null,
        couponDiscount: discount,
        damageWaiver: !!damageWaiver,
        damageWaiverFee: waiverFee,
        lastMinuteFeeAmount: lastMinuteFee,
        totalAmount,
        depositAmount,
        tipAmount: tipAmount || 0,
        amountPaid: 0,
        balanceDue: totalAmount,
        notes: notes || null,
        eventStartTime: schedulingDetails?.eventStartTime || null,
        eventEndTime: schedulingDetails?.eventEndTime || null,
        deliveryWindowStart: schedulingDetails?.deliveryWindowStart || null,
        deliveryWindowEnd: schedulingDetails?.deliveryWindowEnd || null,
        exactDeliveryRequested: !!schedulingDetails?.exactDeliveryRequested,
        exactDeliveryTime: schedulingDetails?.exactDeliveryTime || null,
        exactDeliveryFee: exactDeliveryFeeAmount,
        pickupType: schedulingDetails?.pickupType || 'flexible',
        pickupRequiredByTime: schedulingDetails?.pickupRequiredByTime || null,
        exactPickupTime: schedulingDetails?.exactPickupTime || null,
        exactPickupFee: exactPickupFeeAmount,
        latePickupApprovalRequired: !!schedulingDetails?.latePickupApprovalRequired,
        items: {
          create: (items || []).map((item: any) => ({
            itemId: item.id,
            itemName: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.unitPrice * item.quantity,
          })),
        },
      },
      include: { items: true },
    })

    if (couponCode) {
      await prisma.coupon.update({
        where: { code: String(couponCode).toUpperCase() },
        data: { usageCount: { increment: 1 } },
      }).catch(() => {})
    }

    try {
      await sendEmail({
        to: BUSINESS.email,
        subject: newOrderAdminNotificationEmail({
          orderNumber: order.orderNumber,
          customerName: firstName + ' ' + lastName,
          customerPhone: phone,
          customerEmail: email,
          eventDate: new Date(eventDate).toLocaleDateString(),
          totalAmount,
          amountPaid: 0,
        }).subject,
        html: newOrderAdminNotificationEmail({
          orderNumber: order.orderNumber,
          customerName: firstName + ' ' + lastName,
          customerPhone: phone,
          customerEmail: email,
          eventDate: new Date(eventDate).toLocaleDateString(),
          totalAmount,
          amountPaid: 0,
        }).html,
      })
    } catch (err) {
      console.error('New order admin notification email error:', err)
    }

    return NextResponse.json({ order: { id: order.id, orderNumber: order.orderNumber } })
  } catch (error) {
    console.error('Order creation error:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
