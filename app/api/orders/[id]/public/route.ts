export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
    _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
  ) {
    const order = await prisma.order.findUnique({
          where: { id: (await params).id },
          include: { customer: true, items: true },
    })

  if (!order) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
        order: {
                id: order.id,
                orderNumber: order.orderNumber,
                status: order.status,
                eventDate: order.eventDate,
                eventEndDate: order.eventEndDate,
                eventTimeSlot: order.eventTimeSlot,
                eventAddress: order.eventAddress,
                eventCity: order.eventCity,
                eventZip: order.eventZip,
                deliveryType: order.deliveryType,
                deliveryFee: order.deliveryFee,
                subtotal: order.subtotal,
                taxRate: order.taxRate,
                taxAmount: order.taxAmount,
                totalAmount: order.totalAmount,
                depositAmount: order.depositAmount,
                amountPaid: order.amountPaid,
                balanceDue: order.balanceDue,
                customerName: `${order.customer.firstName} ${order.customer.lastName}`,
                items: order.items.map((i) => ({
                          itemName: i.itemName,
                          quantity: i.quantity,
                          unitPrice: i.unitPrice,
                          total: i.total,
                })),
        },
  })
}
