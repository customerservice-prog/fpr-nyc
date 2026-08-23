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
      eventAddress: order.eventAddress,
      eventCity: order.eventCity,
      eventZip: order.eventZip,
      deliveryType: order.deliveryType,
      subtotal: order.subtotal,
      totalAmount: order.totalAmount,
      amountPaid: order.amountPaid,
      balanceDue: order.balanceDue,
      damageWaiver: order.damageWaiver,
      damageWaiverFee: order.damageWaiverFee,
      deliveryFee: order.deliveryFee,
      taxAmount: order.taxAmount,
      taxRate: order.taxRate,
      contractSignedAt: order.contractSignedAt,
      contractSignatureName: order.contractSignatureName,
      customerName: `${order.customer.firstName} ${order.customer.lastName}`,
      customerEmail: order.customer.email,
      items: order.items.map((i) => ({
        itemName: i.itemName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.total,
      })),
    },
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const body = await request.json()
  const name = (body?.name || '').trim()

  if (!name) {
    return NextResponse.json({ error: 'Signature name is required' }, { status: 400 })
  }

  const order = await prisma.order.findUnique({ where: { id: (await params).id } })
  if (!order) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const forwardedFor = request.headers.get('x-forwarded-for')
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown'

  const updated = await prisma.order.update({
    where: { id: (await params).id },
    data: {
      contractSignedAt: new Date(),
      contractSignatureName: name,
      contractSignatureIp: ip,
    },
  })

  return NextResponse.json({
    success: true,
    contractSignedAt: updated.contractSignedAt,
    contractSignatureName: updated.contractSignatureName,
  })
}
