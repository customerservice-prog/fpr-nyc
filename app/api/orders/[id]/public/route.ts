export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const order = await prisma.order.findUnique({
    where: { id: (await params).id },
    include: { customer: true, items: true, payments: true },
  })

  if (!order) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const refundedAmount = (order.payments || []).filter((p) => p.amount < 0).reduce((sum, p) => sum + Math.abs(p.amount), 0)

  return NextResponse.json({
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      refundedAmount, payments: (order.payments || []).slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((p) => ({ amount: p.amount, createdAt: p.createdAt })),
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
      balanceDue: Math.max((order.totalAmount || 0) - (order.amountPaid || 0), 0),
      customerName: `${order.customer.firstName} ${order.customer.lastName}`,
      items: order.items.map((i) => ({
        itemId: i.itemId,
        itemName: i.itemName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.total,
      })),
    },
  })
}
