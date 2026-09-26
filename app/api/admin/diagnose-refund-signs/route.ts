export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Read-only diagnostic: find Payment records whose notes say "Refund" but whose
// amount is stored as positive (should be negative).
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

const payments = await prisma.payment.findMany({
  where: {
    amount: { gt: 0 },
    notes: { contains: 'Refund', mode: 'insensitive' },
  },
  include: { order: { select: { orderNumber: true } } },
})

const results = payments.map(p => ({
  orderNumber: p.order.orderNumber,
  paymentId: p.id,
  amount: p.amount,
  createdAt: p.createdAt,
  notes: p.notes,
}))

return NextResponse.json({ count: results.length, results })
}
