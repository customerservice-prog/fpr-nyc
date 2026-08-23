export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getNextOrderNumber } from '@/lib/orderNumber'

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
    include: {
      // Constrain only the customer relation so we do NOT read the
      // `unsubscribed` column (may not exist in prod until prisma db push).
      // Order scalar fields are still returned in full via include.
      customer: {
        select: {
          id: true, firstName: true, lastName: true, email: true, phone: true,
          company: true, secondaryPhone: true, secondaryEmail: true,
          customerType: true, address: true, city: true, state: true, zip: true,
          notes: true, creditStatus: true, createdAt: true, updatedAt: true,
        },
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

  const order = await prisma.order.create({
    data: {
      orderNumber: body.orderNumber || await getNextOrderNumber(),
      customerId: customer.id,
      status: body.status || 'quote',
      source: 'admin',
      eventDate: new Date(body.eventDate),
      eventEndDate: body.eventEndDate ? new Date(body.eventEndDate) : null,
      eventTimeSlot: body.eventTimeSlot || null,
      pickupTimeSlot: body.pickupTimeSlot || null,
      eventAddress: body.eventAddress,
      eventCity: body.eventCity,
      eventState: body.eventState || 'NY',
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
