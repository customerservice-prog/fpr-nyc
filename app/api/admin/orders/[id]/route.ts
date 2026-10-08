export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { automaticCancellationEmail, hasDeliverableCustomerEmail, ownerCancellationEmail, ownerNotificationRecipients } from '@/lib/orderLifecycleNotifications'

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
  const isAdmin = (session.user as any)?.role === 'admin'

  const body = await request.json()
  if (body.deliveryType !== undefined && !['delivery', 'pickup'].includes(body.deliveryType)) {
    return NextResponse.json({ error: 'Delivery type must be delivery or pickup.' }, { status: 400 })
  }

  const existingOrder = await prisma.order.findUnique({ where: { id: (await params).id }, include: { items: true } })
  if (!existingOrder) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const allItemsZeroPriced = !!(body.items && body.items.length > 0 && body.items.every((i: any) => !i.unitPrice))
  const legacyLumpSum = allItemsZeroPriced && !!existingOrder && (existingOrder.subtotal || 0) > 0
  const safeSubtotal = legacyLumpSum ? existingOrder!.subtotal : body.subtotal
  const safeTaxAmount = legacyLumpSum ? existingOrder!.taxAmount : body.taxAmount
  const safeTotalAmount = legacyLumpSum ? existingOrder!.totalAmount : body.totalAmount
  const safeBalanceDue = legacyLumpSum ? existingOrder!.balanceDue : body.balanceDue

  const order = await prisma.order.update({
    where: { id: (await params).id },
    data: {
      // Financial totals, pricing overrides, order numbering and line items are
      // admin-only. Non-admin (e.g. staff/VA) sessions may still update core
      // logistics fields below but cannot alter money-affecting data.
      orderNumber: isAdmin ? body.orderNumber : undefined,
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
      setupSurface: body.setupSurface,
      isPublicPark: body.isPublicPark,
      referenceSource: body.referenceSource,
      specialRequestFee: isAdmin ? body.specialRequestFee : undefined,
      specialRequestNames: body.specialRequestNames,
      balanceDue: isAdmin ? safeBalanceDue : undefined,
      amountPaid: isAdmin ? body.amountPaid : undefined,

      subtotal: isAdmin ? safeSubtotal : undefined,
      taxRate: isAdmin ? body.taxRate : undefined,
      taxAmount: isAdmin ? safeTaxAmount : undefined,
      deliveryFee: isAdmin ? body.deliveryFee : undefined,
      totalAmount: isAdmin ? safeTotalAmount : undefined,
      depositAmount: isAdmin ? body.depositAmount : undefined,
      prePayReminderDisabled: isAdmin ? body.prePayReminderDisabled : undefined,
      scheduleApprovedUnpaid: isAdmin ? body.scheduleApprovedUnpaid : undefined,
      locationName: body.locationName,
      generalDiscount: isAdmin ? body.generalDiscount : undefined,
      overrideTravelFee: isAdmin ? body.overrideTravelFee : undefined,
      overrideDepositAmount: isAdmin ? body.overrideDepositAmount : undefined,
      overrideTaxAmount: isAdmin ? body.overrideTaxAmount : undefined, overrideDamageWaiverFee: isAdmin ? body.overrideDamageWaiverFee : undefined, damageWaiverFee: isAdmin ? body.damageWaiverFee : undefined,
      miscellaneousFees: isAdmin ? body.miscellaneousFees : undefined,
      items: (isAdmin && body.items) ? {
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
