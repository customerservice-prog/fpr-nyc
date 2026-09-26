export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Normalizes refund payment sign convention: refunds must be stored as
// NEGATIVE amounts. This matches the majority of reporting code (Refunded
// Payment List and FPRPay Activity Report both detect refunds via
// amount < 0, and Monthly Revenue sums amount directly with no negation).
// The previous approach of storing refunds as positive with a notes-based
// negation only in reports/summary.ts was inconsistent with the rest of the
// codebase and has been reverted (see companion fix to reports/summary/route.ts).
export async function POST() {
    const session = await getServerSession(authOptions)
    if (!session) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

  const payments = await prisma.payment.findMany({
        where: { amount: { gt: 0 }, notes: { contains: 'Refund', mode: 'insensitive' } },
  })

  const details: any[] = []
      for (const p of payments) {
            await prisma.payment.update({ where: { id: p.id }, data: { amount: -p.amount } })
            details.push({ paymentId: p.id, orderId: p.orderId, oldAmount: p.amount, newAmount: -p.amount })
      }

  const totalMagnitude = details.reduce((sum, d) => sum + Math.abs(d.oldAmount), 0)

  return NextResponse.json({ updated: details.length, totalMagnitude, details })
}
