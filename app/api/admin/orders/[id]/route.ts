export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { automaticCancellationEmail, hasDeliverableCustomerEmail, ownerCancellationEmail, ownerNotificationRecipients } from '@/lib/orderLifecycleNotifications'
import { getNycCheckoutPolicy } from '@/lib/nycCheckoutPricingServer'
import { exactPickupFeeForPolicy } from '@/lib/nycCheckoutPolicy'
import { DELIVERY_WINDOWS, timeToMinutes } from '@/lib/nycAdminScheduling'
import { canProcessPayments, hasStaffPermission } from '@/lib/staffPermissions'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const order = await prisma.order.findUnique({
    where: { id: (await params).id },
    include: {
      customer: {
        // explicit select (not `true`) so this query does not read the
        // `unsubscribed` column, which may not yet exist in the production DB.
        // Run `npx prisma db push` to add it, then this can safely use `true`.
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          company: true,
          secondaryPhone: true,
          secondaryEmail: true,
          customerType: true,
          address: true,
          city: true,
          state: true,
          zip: true,
          notes: true,
          creditStatus: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      items: true,
      payments: { orderBy: { createdAt: 'desc' } },
      additionalCharges: { orderBy: { createdAt: 'desc' } },
      contacts: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ order })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as { role?: string } | undefined)?.role
  const isAdmin = role === 'admin'
  const canEditFinancials = hasStaffPermission(role, 'edit_order_financials')
  const canPay = canProcessPayments(role)

  const body = await request.json()
  if (body.deliveryType !== undefined && !['delivery', 'pickup'].includes(body.deliveryType)) {
    return NextResponse.json({ error: 'Delivery type must be delivery or pickup.' }, { status: 400 })
  }

  const savingStructuredSchedule = body.eventStartTime !== undefined || body.deliveryWindowStart !== undefined || body.exactDeliveryRequested !== undefined || body.pickupType !== undefined
  let exactDeliveryFee: number | undefined
  let exactPickupFee: number | undefined
  if (savingStructuredSchedule) {
    const method = body.deliveryType === 'pickup' ? 'pickup' : 'delivery'
    if (method === 'pickup') {
      exactDeliveryFee = 0
      exactPickupFee = 0
    } else {
      const start = typeof body.eventStartTime === 'string' ? body.eventStartTime : null
      const end = typeof body.eventEndTimeValue === 'string' ? body.eventEndTimeValue : null
      if (timeToMinutes(start) < 0 || timeToMinutes(end) <= timeToMinutes(start)) {
        return NextResponse.json({ error: 'Event start and end times are required, and the event must end after it starts.' }, { status: 400 })
      }

      const policy = getNycCheckoutPolicy().policy
      if (body.exactDeliveryRequested === true) {
        const exactDeliveryMinutes = timeToMinutes(body.exactDeliveryTime)
        if (!body.exactDeliveryTime || exactDeliveryMinutes < 8 * 60 || exactDeliveryMinutes > 18 * 60 || exactDeliveryMinutes % 30 !== 0 || exactDeliveryMinutes > timeToMinutes(start)) {
          return NextResponse.json({ error: 'Choose a valid exact delivery time at or before the event starts.' }, { status: 400 })
        }
        if (!policy || policy.exactDeliveryFee === null) {
          return NextResponse.json({ error: 'Guaranteed exact delivery is not currently approved in the NYC checkout policy.' }, { status: 400 })
        }
        exactDeliveryFee = policy.exactDeliveryFee
      } else {
        const selectedWindow = DELIVERY_WINDOWS.find(window =>
          window.start === body.deliveryWindowStart && window.end === body.deliveryWindowEnd
        )
        if (!selectedWindow || timeToMinutes(selectedWindow.end) > timeToMinutes(start)) {
          return NextResponse.json({ error: 'Choose a delivery window that ends before the event starts.' }, { status: 400 })
        }
        exactDeliveryFee = 0
      }

      const pickupType = String(body.pickupType || 'flexible')
      if (!['flexible', 'requiredBy', 'exact'].includes(pickupType)) {
        return NextResponse.json({ error: 'Choose a valid pickup option.' }, { status: 400 })
      }
      if (pickupType === 'requiredBy' && timeToMinutes(body.pickupRequiredByTime) < 0) {
        return NextResponse.json({ error: 'Choose the customer requested-by pickup time.' }, { status: 400 })
      }
      if (pickupType === 'exact') {
        const exactPickupMinutes = timeToMinutes(body.exactPickupTime)
        if (exactPickupMinutes < 12 * 60 || exactPickupMinutes > 23 * 60 + 30 || exactPickupMinutes % 30 !== 0) {
          return NextResponse.json({ error: 'Choose the guaranteed pickup time.' }, { status: 400 })
        }
        const fee = exactPickupFeeForPolicy(policy, body.exactPickupTime)
        if (fee === null) {
          return NextResponse.json({ error: 'That exact pickup time is not currently approved in the NYC checkout policy.' }, { status: 400 })
        }
        exactPickupFee = fee
      } else {
        exactPickupFee = 0
      }
    }
  }

  const existingOrder = await prisma.order.findUnique({ where: { id: (await params).id }, include: { items: true } })
  if (!existingOrder) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const allItemsZeroPriced = !!(body.items && body.items.length > 0 && body.items.every((i: any) => !i.unitPrice))
  const legacyLumpSum = allItemsZeroPriced && (existingOrder.subtotal || 0) > 0

  const previousScheduleFee = Number(existingOrder.exactDeliveryFee || 0) + Number(existingOrder.exactPickupFee || 0)
  const nextScheduleFee = savingStructuredSchedule
    ? Number(exactDeliveryFee || 0) + Number(exactPickupFee || 0)
    : previousScheduleFee
  const scheduleFeeDelta = Math.round((nextScheduleFee - previousScheduleFee) * 100) / 100

  if (savingStructuredSchedule && Math.abs(scheduleFeeDelta) > 0.001 && !canEditFinancials) {
    return NextResponse.json(
      { error: 'This staff role cannot change a schedule option that changes the order price.' },
      { status: 403 },
    )
  }

  const scheduleTaxDelta = savingStructuredSchedule && existingOrder.overrideTaxAmount == null
    ? Math.round(scheduleFeeDelta * (Number(existingOrder.taxRate || 0) / 100) * 100) / 100
    : 0

  const requestedSubtotal = canEditFinancials ? body.subtotal : undefined
  const requestedTaxAmount = canEditFinancials ? body.taxAmount : undefined
  const requestedTotalAmount = canEditFinancials ? body.totalAmount : undefined

  const safeSubtotal = legacyLumpSum
    ? existingOrder.subtotal
    : Number(requestedSubtotal ?? existingOrder.subtotal)

  const safeTaxAmount = savingStructuredSchedule && requestedTaxAmount == null
    ? Math.round((Number(existingOrder.taxAmount || 0) + scheduleTaxDelta) * 100) / 100
    : legacyLumpSum
      ? Number(existingOrder.taxAmount || 0)
      : Number(requestedTaxAmount ?? existingOrder.taxAmount)

  const safeTotalAmount = savingStructuredSchedule && requestedTotalAmount == null
    ? Math.round((Number(existingOrder.totalAmount || 0) + scheduleFeeDelta + scheduleTaxDelta) * 100) / 100
    : legacyLumpSum
      ? Number(existingOrder.totalAmount || 0)
      : Number(requestedTotalAmount ?? existingOrder.totalAmount)

  const safeAmountPaid = canPay ? Number(body.amountPaid ?? existingOrder.amountPaid) : Number(existingOrder.amountPaid)
  const safeBalanceDue = Math.max(Math.round((safeTotalAmount - safeAmountPaid) * 100) / 100, 0)

  const order = await prisma.order.update({
    where: { id: (await params).id },
    data: {
      // Financial totals, pricing overrides, order numbering and line items are
      // admin-only. Non-admin (e.g. staff/VA) sessions may still update core
      // logistics fields below but cannot alter money-affecting data.
      orderNumber: canEditFinancials ? body.orderNumber : undefined,
      status: body.status,
      internalNotes: body.internalNotes, followUpsPaused: typeof body.followUpsPaused === 'boolean' ? body.followUpsPaused : undefined,
      eventDate: body.eventDate ? new Date(body.eventDate) : undefined,
      eventEndDate: body.eventEndDate ? new Date(body.eventEndDate) : undefined,
      eventAddress: body.eventAddress,
      eventCity: body.eventCity,
      eventState: body.eventState,
      eventZip: body.eventZip,
      notes: body.notes, deliveryType: body.deliveryType,
      eventTimeSlot: body.eventTimeSlot,
      pickupTimeSlot: body.pickupTimeSlot,
      eventStartTime: savingStructuredSchedule ? (body.deliveryType === 'pickup' ? null : body.eventStartTime || null) : undefined,
      eventEndTime: savingStructuredSchedule ? (body.deliveryType === 'pickup' ? null : body.eventEndTimeValue || null) : undefined,
      deliveryWindowStart: savingStructuredSchedule ? (body.deliveryType === 'pickup' || body.exactDeliveryRequested ? null : body.deliveryWindowStart || null) : undefined,
      deliveryWindowEnd: savingStructuredSchedule ? (body.deliveryType === 'pickup' || body.exactDeliveryRequested ? null : body.deliveryWindowEnd || null) : undefined,
      exactDeliveryRequested: savingStructuredSchedule ? (body.deliveryType === 'pickup' ? false : body.exactDeliveryRequested === true) : undefined,
      exactDeliveryTime: savingStructuredSchedule ? (body.deliveryType === 'pickup' || !body.exactDeliveryRequested ? null : body.exactDeliveryTime || null) : undefined,
      exactDeliveryFee: savingStructuredSchedule ? exactDeliveryFee : undefined,
      pickupType: savingStructuredSchedule ? (body.deliveryType === 'pickup' ? 'flexible' : body.pickupType || 'flexible') : undefined,
      pickupRequiredByTime: savingStructuredSchedule ? (body.deliveryType === 'pickup' || body.pickupType !== 'requiredBy' ? null : body.pickupRequiredByTime || null) : undefined,
      exactPickupTime: savingStructuredSchedule ? (body.deliveryType === 'pickup' || body.pickupType !== 'exact' ? null : body.exactPickupTime || null) : undefined,
      exactPickupFee: savingStructuredSchedule ? exactPickupFee : undefined,
      latePickupApprovalRequired: savingStructuredSchedule ? false : undefined,
      setupSurface: body.setupSurface,
      isPublicPark: body.isPublicPark,
      referenceSource: body.referenceSource,
      specialRequestFee: canEditFinancials ? body.specialRequestFee : undefined,
      specialRequestNames: body.specialRequestNames,
      balanceDue: (canEditFinancials || savingStructuredSchedule) ? safeBalanceDue : undefined,
      amountPaid: canPay ? safeAmountPaid : undefined,

      subtotal: canEditFinancials ? safeSubtotal : undefined,
      taxRate: canEditFinancials ? body.taxRate : undefined,
      taxAmount: (canEditFinancials || savingStructuredSchedule) ? safeTaxAmount : undefined,
      deliveryFee: canEditFinancials ? body.deliveryFee : undefined,
      totalAmount: (canEditFinancials || savingStructuredSchedule) ? safeTotalAmount : undefined,
      depositAmount: canEditFinancials ? body.depositAmount : undefined,
      prePayReminderDisabled: canEditFinancials ? body.prePayReminderDisabled : undefined,
      scheduleApprovedUnpaid: canEditFinancials ? body.scheduleApprovedUnpaid : undefined,
      locationName: body.locationName,
      generalDiscount: canEditFinancials ? body.generalDiscount : undefined,
      overrideTravelFee: canEditFinancials ? body.overrideTravelFee : undefined,
      overrideDepositAmount: canEditFinancials ? body.overrideDepositAmount : undefined,
      overrideTaxAmount: canEditFinancials ? body.overrideTaxAmount : undefined, overrideDamageWaiverFee: canEditFinancials ? body.overrideDamageWaiverFee : undefined, damageWaiverFee: canEditFinancials ? body.damageWaiverFee : undefined,
      miscellaneousFees: canEditFinancials ? body.miscellaneousFees : undefined,
      items: (canEditFinancials && body.items) ? {
        deleteMany: {},
        create: body.items.map((i: any) => ({
          itemId: i.itemId || undefined,
          itemName: i.itemName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.total,
        })),
      } : undefined,
    },
    include: {
      customer: {
        // explicit select (not `true`) so this query does not read the
        // `unsubscribed` column, which may not yet exist in the production DB.
        // Run `npx prisma db push` to add it, then this can safely use `true`.
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          company: true,
          secondaryPhone: true,
          secondaryEmail: true,
          customerType: true,
          address: true,
          city: true,
          state: true,
          zip: true,
          notes: true,
          creditStatus: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      items: true,
      payments: true,
      additionalCharges: { orderBy: { createdAt: 'desc' } },
      contacts: { orderBy: { createdAt: 'asc' } },
    },
  })

  const wasCanceled = ['canceled','cancelled'].includes(existingOrder.status)
  const isNowCanceled = ['canceled','cancelled'].includes(order.status)
  if (!wasCanceled && isNowCanceled) {
    const customerName = order.customer.firstName + ' ' + order.customer.lastName
    const customerContent = automaticCancellationEmail({ orderNumber: order.orderNumber, customerName, eventDate: order.eventDate })
    const ownerContent = ownerCancellationEmail({
      id: order.id, orderNumber: order.orderNumber, customerName,
      customerEmail: order.customer.email, customerPhone: order.customer.phone,
      eventDate: order.eventDate, amountPaid: order.amountPaid,
      balanceDue: Math.max(Math.round((order.totalAmount - order.amountPaid) * 100) / 100, 0),
    })
    const sends: Promise<unknown>[] = [sendEmail({ to: ownerNotificationRecipients(), subject: ownerContent.subject, html: ownerContent.html })]
    if (hasDeliverableCustomerEmail(order.customer.email)) sends.push(sendEmail({ to: order.customer.email, subject: customerContent.subject, html: customerContent.html }))
    await Promise.allSettled(sends)
  }

  return NextResponse.json({ order })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.order.delete({ where: { id: (await params).id } })
  return NextResponse.json({ success: true })
}
