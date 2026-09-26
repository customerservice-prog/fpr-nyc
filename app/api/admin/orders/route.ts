export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getNextOrderNumber } from '@/lib/orderNumber'
import { evaluateRentalRestrictions } from '@/lib/rentalRestrictions'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const status = searchParams.get('status')
  const search = searchParams.get('search')

  const orders = await prisma.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(search ? {
        AND: search.trim().split(/\s+/).filter(Boolean).map((word) => ({
          OR: [
            { orderNumber: { contains: word, mode: 'insensitive' } },
            { customer: { firstName: { contains: word, mode: 'insensitive' } } },
            { customer: { lastName: { contains: word, mode: 'insensitive' } } },
          ],
        })),
      } : {}),
    },
select: {
      id: true,
      orderNumber: true,
      status: true,
      eventDate: true,
      totalAmount: true,
      amountPaid: true,
      balanceDue: true,
      checkoutStage: true,
      checkoutLastSeenAt: true,
      createdAt: true,
      customer: {
              select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      },
},
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ orders })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const customer = body.customerId
    ? await prisma.customer.update({
        where: { id: body.customerId },
        data: body.customer,
      })
    : await prisma.customer.create({
        data: body.customer,
      })

                                                                const restrictionCheck = await evaluateRentalRestrictions({
                                                                        customerId: customer.id,
                                                                        emails: [customer.email, customer.secondaryEmail],
                                                                        phones: [customer.phone, customer.secondaryPhone],
                                                                        address: { street1: body.eventAddress, city: body.eventCity, state: body.eventState, zip: body.eventZip },
                                                                })

      if (restrictionCheck.matched) {
              const overrideReason = body.restrictionOverride?.reason
              if (!overrideReason) {
                        return NextResponse.json({
                                    error: 'This booking matches an active rental restriction and requires manager review before it can be created.',
                                    restrictionMatch: restrictionCheck,
                        }, { status: 409 })
              }
              const role = (session.user as { role?: string } | undefined)?.role
              if (role !== 'admin') {
                        return NextResponse.json({ error: 'Only an admin can override a rental restriction match.' }, { status: 403 })
              }
      }

  const order = await prisma.order.create({
    data: {
      orderNumber: body.orderNumber || await getNextOrderNumber(),
      customerId: customer.id,
      status: body.status || 'quote',
      source: 'admin',
      restrictionMatchedIds: restrictionCheck.matched ? restrictionCheck.restrictionIds : [],
      restrictionOverrideAt: restrictionCheck.matched ? new Date() : null,
      restrictionOverrideByName: restrictionCheck.matched ? ((session.user as { name?: string } | undefined)?.name || 'Admin') : null,
      restrictionOverrideReason: restrictionCheck.matched ? body.restrictionOverride.reason : null,
      eventDate: new Date(body.eventDate),
      eventEndDate: body.eventEndDate ? new Date(body.eventEndDate) : null,
      eventTimeSlot: body.eventTimeSlot || null,
      pickupTimeSlot: body.pickupTimeSlot || null,
      eventAddress: body.eventAddress,
      eventCity: body.eventCity,
      eventState: body.eventState || 'SC',
      eventZip: body.eventZip,
      deliveryType: body.deliveryType || 'delivery',
      subtotal: body.subtotal,
      taxRate: body.taxRate,
      taxAmount: body.taxAmount,
      deliveryFee: body.deliveryFee || 0,
      deliveryDistance: body.deliveryDistance ?? null,
      couponCode: body.couponCode || null,
      couponDiscount: body.couponDiscount || 0,
      totalAmount: body.totalAmount,
      depositAmount: body.depositAmount || 0,
      amountPaid: body.amountPaid || 0,
      balanceDue: body.balanceDue || body.totalAmount,
      notes: body.notes,
      internalNotes: body.internalNotes || null,
      setupSurface: body.setupSurface || null,
      isPublicPark: body.isPublicPark || false,
      referenceSource: body.referenceSource || null,
      items: {
        create: body.items.map((item: { itemId?: string; itemName: string; quantity: number; unitPrice: number }) => ({
          itemId: item.itemId || null,
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.unitPrice * item.quantity,
        })),
      },
    },
    include: { customer: true, items: true },
  })

  return NextResponse.json({ order })
}
