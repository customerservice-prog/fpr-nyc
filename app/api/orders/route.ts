export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getNextOrderNumber } from '@/lib/orderNumber'
import { BUSINESS } from '@/lib/utils'
import { sendEmail, newOrderAdminNotificationEmail } from '@/lib/email'
import { hasDeliverableCustomerEmail, orderReceivedEmail, ownerNotificationRecipients } from '@/lib/orderLifecycleNotifications'
import { evaluateRentalRestrictions } from '@/lib/rentalRestrictions'
import { DeliveryQuoteError, getDeliveryQuote, requireDeliveryMethod, requireMatchingDeliveryFee } from '@/lib/delivery'
import { effectiveEventEndDate } from '@/lib/orderDates'
import { isNycPaymentsUnavailable, requireNycStripe } from '@/lib/stripe'
import { NYC_PAYMENTS_UNAVAILABLE_MESSAGE } from '@/lib/nycStripeGuard'
import { CheckoutPricingError, checkoutLineName, sameCents, validateFirstPaymentPrincipal } from '@/lib/nycCheckoutPricing'
import { aggregateQuantities, priceNycCheckout } from '@/lib/nycCheckoutPricingServer'
import { exactSlotConflict, findInventoryShortfalls, lockNycCapacity, rentalPeriod, shortfallMessage } from '@/lib/nycInventory'

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
    // A retry after a failed payment step reuses the same unpaid online order instead
    // of colliding with its checkout key; an order that already took money is final.
    if (draftOrder && (draftOrder.source !== 'online' || Number(draftOrder.amountPaid || 0) > 0 || !['incomplete', 'quote'].includes(draftOrder.status))) {
      return NextResponse.json({
        error: 'This checkout was already completed as order #' + draftOrder.orderNumber + '. Please check your email or call ' + BUSINESS.phone + ' before paying again.',
        code: 'order_already_placed',
        orderNumber: draftOrder.orderNumber,
      }, { status: 409 })
    }
    const reusableDraft = draftOrder

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
    // All colors of an item share its stock, and multi-day rentals block every day.
    // (Re-checked below under a lock, in the same transaction as the order write.)
    const requestedTotals = aggregateQuantities((items || []).map((item: any) => ({ id: typeof item?.id === 'string' ? item.id : '', quantity: Number(item?.quantity) || 0 })))
    const requestedDays = Number(rentalDays) > 0 ? Math.min(Math.floor(Number(rentalDays)), 60) : 1
    const precheck = await findInventoryShortfalls(prisma, requestedTotals, rentalPeriod(new Date(eventDate), requestedDays), reusableDraft?.id)
    if (precheck.length) {
      return NextResponse.json({ error: shortfallMessage(precheck[0]) }, { status: 400 })
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

    const exactTimeSettings = wantsExactDelivery || wantsExactPickup ? await prisma.exactTimeSettings.findFirst() : null
    if ((wantsExactDelivery || wantsExactPickup) && exactTimeSettings?.enabled === false) {
      return NextResponse.json({ error: 'Exact-time scheduling is currently unavailable. Please choose a standard delivery window or flexible pickup, or call our office for assistance.' }, { status: 400 })
    }
    const defaultCapacity = exactTimeSettings?.defaultCapacityPerSlot ?? 1

    // Link the order to an existing customer only by email (a phone match alone is
    // used for rental-restriction checks, never to attach an order to someone else).
    let customer = await prisma.customer.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
    })
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
    const colorRows = await prisma.item.findMany({ where: { id: { in: pricing.lines.map(line => line.itemId) } }, select: { id: true, colorOptions: true } })
    const colorsById = new Map(colorRows.map(row => [row.id, row.colorOptions || []]))
    const itemCreates = pricing.lines.map((line, index) => {
      return {
        itemId: line.itemId,
        itemName: checkoutLineName(line.itemName, colorsById.get(line.itemId) || [], items?.[index]?.name),
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        total: line.total,
      }
    })
    const period = rentalPeriod(baseOrderData.eventDate, rentalDayCount, baseOrderData.eventEndDate)
    const pricedTotals = aggregateQuantities(pricing.lines.map(line => ({ id: line.itemId, quantity: line.quantity })))
    const written = await prisma.$transaction(async (tx) => {
      await lockNycCapacity(tx)
      const shortfalls = await findInventoryShortfalls(tx, pricedTotals, period, reusableDraft?.id)
      if (shortfalls.length) return { ok: false as const, error: shortfallMessage(shortfalls[0]) }
      if (wantsExactDelivery || wantsExactPickup) {
        const conflict = await exactSlotConflict(tx, {
          eventDate: baseOrderData.eventDate,
          deliveryTime: wantsExactDelivery ? schedulingDetails.exactDeliveryTime : null,
          pickupTime: wantsExactPickup ? schedulingDetails.exactPickupTime : null,
          defaultCapacity,
          excludeOrderId: reusableDraft?.id,
        })
        if (conflict) return { ok: false as const, error: 'That exact ' + conflict + ' time was just booked by another customer. Please go back and choose a different time.', status: 409 }
      }
      const saved = reusableDraft
        ? await tx.order.update({
            where: { id: reusableDraft.id },
            data: { ...baseOrderData, items: { deleteMany: {}, create: itemCreates } },
            include: { items: true },
          })
        : await tx.order.create({
            data: { ...baseOrderData, orderNumber, ...(checkoutDraftKey ? { checkoutDraftKey } : {}), items: { create: itemCreates } },
            include: { items: true },
          })
      return { ok: true as const, order: saved }
    }, { maxWait: 10000, timeout: 20000 })
    if (!written.ok) {
      return NextResponse.json({ error: written.error }, { status: 'status' in written && written.status ? written.status : 400 })
    }
    const order = written.order

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
