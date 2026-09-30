export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getNextOrderNumber } from '@/lib/orderNumber'
import { BUSINESS } from '@/lib/utils'
import { sendEmail, newOrderAdminNotificationEmail } from '@/lib/email'
import { hasDeliverableCustomerEmail, orderReceivedEmail, ownerNotificationRecipients } from '@/lib/orderLifecycleNotifications'
import { getItemAvailability } from '@/lib/availability'
import { evaluateRentalRestrictions } from '@/lib/rentalRestrictions'
import { DeliveryQuoteError, getDeliveryQuote, requireDeliveryMethod, requireMatchingDeliveryFee } from '@/lib/delivery'
import { effectiveEventEndDate } from '@/lib/orderDates'
import { isNycPaymentsUnavailable, requireNycStripe } from '@/lib/stripe'
import { NYC_PAYMENTS_UNAVAILABLE_MESSAGE } from '@/lib/nycStripeGuard'
import { CheckoutPricingError, sameCents, validateFirstPaymentPrincipal } from '@/lib/nycCheckoutPricing'
import { aggregateQuantities, priceNycCheckout } from '@/lib/nycCheckoutPricingServer'

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
    // Enforce NYC / Lower Westchester's public delivery-only policy before any database writes,
    // inventory reservations, email notifications, or payment creation.
    requireDeliveryMethod(body?.deliveryType)
    // Online orders are created only to be paid immediately. If NYC online payments
    // are not fully configured and switched on, refuse before creating anything
    // (no customer, order, inventory hold, or "order received" email).
    await requireNycStripe('charge')
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
      notes,
      items,
      subtotal,
      rentalDays,
      durationLabel,
      durationFee,
      specialRequestFee,
      specialRequestNames,
      deliveryFee,
      taxRate,
      taxAmount,
      couponCode,
      couponDiscount,
      damageWaiver,
      damageWaiverFee,
      totalAmount: totalAmountInput,
      depositAmount,
      schedulingDetails,
      checkoutDraftKey,
    } = body

    if (!firstName || !lastName || !email || !eventDate || !items?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (typeof eventAddress !== 'string' || !eventAddress.trim() || typeof eventCity !== 'string' || !eventCity.trim()) {
      return NextResponse.json({ error: 'Please provide your event delivery address and city. Warehouse pickup is not available.' }, { status: 400 })
    }

    // Recalculate from the ZIP on the server. Missing, stale, zero, and manipulated
    // delivery fees cannot create an order. Never silently change an agreed total.
    const deliveryQuote = await getDeliveryQuote(eventZip)
    requireMatchingDeliveryFee(deliveryFee, deliveryQuote)

    const normalizedEmail = String(email).trim().toLowerCase()
    const normalizedPhone = phone ? String(phone).trim() : null
    const draftOrder = typeof checkoutDraftKey === 'string' && checkoutDraftKey
      ? await prisma.order.findUnique({ where: { checkoutDraftKey } })
      : null
    const reusableDraft = draftOrder && draftOrder.status === 'incomplete' && draftOrder.source === 'online' ? draftOrder : null

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
    const requestedTotals = aggregateQuantities((items || []).map((item: any) => ({ id: typeof item?.id === 'string' ? item.id : '', quantity: Number(item?.quantity) || 0 })))
    for (const [itemId, requestedQty] of requestedTotals) {
      const requestedItem = (items || []).find((item: any) => item?.id === itemId)
      const available = await getItemAvailability(itemId, new Date(eventDate))
      if (requestedQty > available) {
        return NextResponse.json({
          error: available > 0
            ? 'Only ' + available + ' of "' + requestedItem?.name + '" available for the selected date. Please adjust the quantity in your cart.'
            : '"' + requestedItem?.name + '" is no longer available for the selected date. Please remove it or choose another date.',
        }, { status: 400 })
      }
    }

    // SECURITY: recompute every price, fee, discount, tax, and the deposit on the
    // server from the approved catalog and settings. Browser amounts are only used
    // to detect that the customer was shown a different total.
    const pricing = await priceNycCheckout(body)
    if (!sameCents(totalAmountInput, pricing.grandTotal)) {
      return NextResponse.json({
        error: 'Your order total changed to $' + pricing.grandTotal.toFixed(2) + '. Please reload the payment page and review the updated total before paying.',
        code: 'pricing_changed',
      }, { status: 409 })
    }
    const paymentPrincipal = validateFirstPaymentPrincipal(depositAmount, pricing)

    // Server-side exact-time delivery/pickup capacity check: never trust
    // frontend-only availability for premium exact-time slots. Revalidates
    // and atomically reserves the slot at submission time so two customers
    // can never both be promised the same exact-time slot.
    // Here pickup means OUR CREW collecting equipment from the event, not warehouse pickup.
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

    const orderNumber = reusableDraft?.orderNumber || await getNextOrderNumber()
    const totalAmount = Math.round(pricing.totalWithTip * 100) / 100
    const rentalDayCount = Math.max(pricing.rentalDays || 1, 1)

    const baseOrderData: any = {
      customerId: customer.id,
      status: 'quote',
      source: 'online',
      checkoutStage: 'order_created',
      checkoutLastSeenAt: new Date(),
      eventDate: new Date(eventDate),
      eventEndDate: effectiveEventEndDate(new Date(eventDate), null, rentalDayCount),
      eventAddress: eventAddress || null,
      eventCity: eventCity || null,
      eventState: eventState || 'NY',
      eventZip: eventZip || null,
      eventTimeSlot: eventTimeSlot || null,
      pickupTimeSlot: pickupTimeSlot || null,
      deliveryType: 'delivery',
      deliveryFee: pricing.deliveryFee,
      deliveryDistance: deliveryQuote.distance,
      subtotal: pricing.adjustedSubtotal,
      rentalDays: rentalDayCount,
      durationLabel: pricing.durationLabel,
      durationFee: pricing.durationFee,
      specialRequestFee: pricing.specialRequestFee,
      specialRequestNames: pricing.specialRequestNames,
      taxRate: pricing.taxRate,
      taxAmount: pricing.taxAmount,
      couponCode: pricing.couponCode,
      couponDiscount: pricing.couponDiscount,
      damageWaiver: pricing.damageWaiver,
      damageWaiverFee: pricing.damageWaiverFee,
      lastMinuteFeeAmount: pricing.lastMinuteFee,
      totalAmount,
      depositAmount: paymentPrincipal,
      tipAmount: pricing.tipAmount,
      amountPaid: 0,
      balanceDue: totalAmount,
      pricingVersion: pricing.version,
      // Where the sales tax was charged, for the NYS sales tax return.
      internalNotes: 'Sales tax: ' + pricing.taxRate + '% ' + pricing.taxJurisdiction.name + ', NYS reporting code ' + pricing.taxJurisdiction.reportingCode + ' (delivery ZIP ' + pricing.taxJurisdiction.zip + ').',
      notes: notes || null,
      eventStartTime: schedulingDetails?.eventStartTime || null,
      eventEndTime: schedulingDetails?.eventEndTime || null,
      deliveryWindowStart: schedulingDetails?.deliveryWindowStart || null,
      deliveryWindowEnd: schedulingDetails?.deliveryWindowEnd || null,
      exactDeliveryRequested: !!schedulingDetails?.exactDeliveryRequested,
      exactDeliveryTime: schedulingDetails?.exactDeliveryTime || null,
      exactDeliveryFee: pricing.exactDeliveryFee,
      pickupType: schedulingDetails?.pickupType || 'flexible',
      pickupRequiredByTime: schedulingDetails?.pickupRequiredByTime || null,
      exactPickupTime: schedulingDetails?.exactPickupTime || null,
      exactPickupFee: pricing.exactPickupFee,
      latePickupApprovalRequired: !!schedulingDetails?.latePickupApprovalRequired,
    }
    // Line items use catalog names and prices from the server. The browser label is
    // kept only when it is the catalog name plus a selected color option.
    const itemCreates = pricing.lines.map((line, index) => {
      const browserName = typeof items?.[index]?.name === 'string' ? items[index].name.trim() : ''
      return {
        itemId: line.itemId,
        itemName: browserName && browserName.startsWith(line.itemName) ? browserName.slice(0, 240) : line.itemName,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        total: line.total,
      }
    })
    const order = reusableDraft
      ? await prisma.order.update({
          where: { id: reusableDraft.id },
          data: { ...baseOrderData, items: { deleteMany: {}, create: itemCreates } },
          include: { items: true },
        })
      : await prisma.order.create({
          data: { ...baseOrderData, orderNumber, ...(checkoutDraftKey ? { checkoutDraftKey } : {}), items: { create: itemCreates } },
          include: { items: true },
        })

    if (pricing.couponCode) {
      await prisma.coupon.update({
        where: { code: pricing.couponCode },
        data: { usageCount: { increment: 1 } },
      }).catch(() => {})
    }

    try {
      const ownerContent = newOrderAdminNotificationEmail({
        orderNumber: order.orderNumber,
        customerName: firstName + ' ' + lastName,
        customerPhone: phone,
        customerEmail: normalizedEmail,
        eventDate: new Date(eventDate).toLocaleDateString(),
        totalAmount,
        amountPaid: 0,
      })
      const customerContent = orderReceivedEmail({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: firstName + ' ' + lastName,
        eventDate: order.eventDate,
        eventAddress: order.eventAddress,
        eventCity: order.eventCity,
        eventState: order.eventState,
        eventZip: order.eventZip,
        totalAmount: order.totalAmount,
        depositAmount: order.depositAmount,
        items: order.items,
      })
      const sends: Promise<unknown>[] = [
        sendEmail({ to: ownerNotificationRecipients(), subject: ownerContent.subject, html: ownerContent.html }),
      ]
      if (hasDeliverableCustomerEmail(normalizedEmail)) {
        sends.push(sendEmail({ to: normalizedEmail, subject: customerContent.subject, html: customerContent.html }))
      }
      await Promise.allSettled(sends)
    } catch (err) {
      console.error('New order notification email error:', err)
    }

    return NextResponse.json({ order: { id: order.id, orderNumber: order.orderNumber } })
  } catch (error) {
    if (isNycPaymentsUnavailable(error)) {
      console.error('Order creation blocked:', error.reason)
      return NextResponse.json({ error: NYC_PAYMENTS_UNAVAILABLE_MESSAGE, code: 'payments_unavailable' }, { status: 503 })
    }
    if (error instanceof DeliveryQuoteError || error instanceof CheckoutPricingError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Order creation error:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
