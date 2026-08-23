export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// One-time fix: backfill createdAt on ERS-imported Orders and Payments
// (which were incorrectly stamped with the migration run date) so reports
// bucket historical revenue/tax data by each order's real event date.
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orders = await prisma.order.findMany({
    where: { orderNumber: { startsWith: 'ERS-' } },
    select: { id: true, eventDate: true },
  })

  let ordersUpdated = 0
  let paymentsUpdated = 0

  for (const o of orders) {
    await prisma.order.update({
      where: { id: o.id },
      data: { createdAt: o.eventDate },
    })
    ordersUpdated++

    const result = await prisma.payment.updateMany({
      where: { orderId: o.id },
      data: { createdAt: o.eventDate },
    })
    paymentsUpdated += result.count
  }

  return NextResponse.json({ ordersUpdated, paymentsUpdated })
}
