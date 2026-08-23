export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { finalizePayment } from '@/lib/payments'

const ALLOWED_METHODS = ['check', 'cash', 'gift_card']

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { amount, tipAmount, method, sendReceipt, notes } = await request.json()

    if (!ALLOWED_METHODS.includes(method)) {
      return NextResponse.json({ error: 'Invalid payment method for manual payment' }, { status: 400 })
    }

    const paidAmount = Number(amount) || 0
    if (paidAmount <= 0) {
      return NextResponse.json({ error: 'Enter a valid amount' }, { status: 400 })
    }

    const order = await prisma.order.findUnique({ where: { id: (await params).id } })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const tip = Number(tipAmount) || 0
    const remainingBalance = Math.max(order.totalAmount - order.amountPaid, 0)
    if (paidAmount > remainingBalance + tip + 0.01) {
      return NextResponse.json({ error: 'Amount exceeds the remaining balance of $' + remainingBalance.toFixed(2) }, { status: 400 })
    }

    const updated = await finalizePayment({
      orderId: order.id,
      amount: paidAmount,
      tipAmount: tip,
      method,
      notes: notes || undefined,
      sendReceipt: sendReceipt !== false,
      recordedByName: session.user?.name || null,
    })

    return NextResponse.json({ success: true, order: updated })
  } catch (error) {
    console.error('Manual payment error:', error)
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
  }
}
