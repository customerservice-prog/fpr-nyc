export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
  ) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderId } = await request.json()
  if (!orderId) return NextResponse.json({ error: 'orderId is required' }, { status: 400 })

  const raincheck = await prisma.raincheck.findUnique({ where: { id: (await params).id } })
  if (!raincheck) return NextResponse.json({ error: 'Raincheck not found' }, { status: 404 })
  if (raincheck.redeemedAt) return NextResponse.json({ error: 'This raincheck has already been redeemed' }, { status: 400 })
  if (raincheck.expiresAt && raincheck.expiresAt < new Date()) {
    return NextResponse.json({ error: 'This raincheck has expired' }, { status: 400 })
    }

  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.customerId !== raincheck.customerId) {
    return NextResponse.json({ error: "This raincheck does not belong to this order's customer" }, { status: 400 })
    }

  const currentBalanceDue = order.balanceDue ?? Math.max(order.totalAmount - order.amountPaid, 0)
  if (currentBalanceDue <= 0) {
    return NextResponse.json({ error: 'This order has no remaining balance to apply a credit to' }, { status: 400 })
    }

  const creditAmount = Math.min(raincheck.amount, currentBalanceDue)

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      amountPaid: order.amountPaid + creditAmount,
      balanceDue: Math.max(currentBalanceDue - creditAmount, 0),
      payments: {
        create: {
          amount: creditAmount,
          method: 'raincheck',
          notes: 'Raincheck credit applied' + (raincheck.reason ? ' - ' + raincheck.reason : ''),
          },
        },
      },
    })

  await prisma.raincheck.update({
    where: { id: (await params).id },
    data: { redeemedAt: new Date(), redeemedOrderId: orderId },
    })

  return NextResponse.json({ success: true, order: updatedOrder, creditAmount })
  }
