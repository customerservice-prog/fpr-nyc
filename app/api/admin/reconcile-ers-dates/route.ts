export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// One-time reconciliation tool: accepts an array of true ERS payment records
// [orderNumberSuffix, 'YYYY-MM-DD', amount] scraped from the ERS tax_report page,
// matches each to a Payment record in our DB by orderNumber + amount, and (if
// dryRun is false) corrects the payment's createdAt date to match ERS.
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if ((session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

const body = await request.json()
  const truth: [string, string, number][] = body.truth
  const dryRun = body.dryRun !== false

const byOrder = new Map<string, { date: string; amount: number }[]>()
  for (const [suffix, date, amount] of truth) {
    const orderNumber = 'ERS-' + suffix
    if (!byOrder.has(orderNumber)) byOrder.set(orderNumber, [])
    byOrder.get(orderNumber)!.push({ date, amount })
  }

const mismatches: any[] = []
  const ambiguous: any[] = []
    const errors: any[] = []
      let updated = 0

for (const [orderNumber, entries] of Array.from(byOrder.entries())) {
  const order = await prisma.order.findFirst({ where: { orderNumber } })
  if (!order) { errors.push({ orderNumber, reason: 'order not found' }); continue }

  const payments = await prisma.payment.findMany({ where: { orderId: order.id } })
  const claimed = new Set<string>()

  for (const entry of entries) {
    const candidates = payments.filter(p => !claimed.has(p.id) && Math.abs(p.amount - entry.amount) < 0.005)
    if (candidates.length === 0) {
      errors.push({ orderNumber, amount: entry.amount, reason: 'no matching payment found' })
      continue
    }
    if (candidates.length > 1) {
      ambiguous.push({ orderNumber, amount: entry.amount, candidateCount: candidates.length })
      continue
    }
    const payment = candidates[0]
    claimed.add(payment.id)
    const currentDateStr = new Date(payment.createdAt).toISOString().slice(0, 10)
    if (currentDateStr !== entry.date) {
      mismatches.push({ orderNumber, paymentId: payment.id, amount: entry.amount, oldDate: currentDateStr, newDate: entry.date })
      if (!dryRun) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { createdAt: new Date(entry.date + 'T12:00:00.000Z') },
        })
        updated++
      }
    }
  }
}

return NextResponse.json({
  dryRun,
  totalTruthEntries: truth.length,
  ordersChecked: byOrder.size,
  mismatchesFound: mismatches.length,
  updated,
  mismatches,
  ambiguous,
  errors,
})
}
