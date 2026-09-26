export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// One-time fix for two special-case orders found during date reconciliation:
// ERS-7833: two refund payments (-112.26, -227.93 on 2026-07-11) existed in ERS
// truth data but were never imported into our DB at all. Order totals also never
// reflected the refund. This creates the missing payments and corrects amountPaid/balanceDue.
// ERS-8342: two identical $478.43 charge payments both stored with date 2026-06-27,
// but ERS truth shows they occurred on 2026-06-10 and 2026-07-01 respectively.
// Since the two payment records are otherwise identical, this assigns one to each date.
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if ((session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const order7833 = await prisma.order.findFirst({ where: { orderNumber: 'ERS-7833' } })
  if (!order7833) return NextResponse.json({ error: 'ERS-7833 not found' }, { status: 404 })

  await prisma.payment.create({
    data: {
      orderId: order7833.id,
      amount: -112.26,
      method: 'card',
      notes: 'Refund (imported from ERS)',
      createdAt: new Date('2026-07-11T12:00:00.000Z'),
    },
  })
  await prisma.payment.create({
    data: {
      orderId: order7833.id,
      amount: -227.93,
      method: 'card',
      notes: 'Refund (imported from ERS)',
      createdAt: new Date('2026-07-11T12:00:00.000Z'),
    },
  })

  const newAmountPaid7833 = order7833.amountPaid - 112.26 - 227.93
  const newBalanceDue7833 = order7833.totalAmount - newAmountPaid7833
  await prisma.order.update({
    where: { id: order7833.id },
    data: { amountPaid: newAmountPaid7833, balanceDue: newBalanceDue7833 },
  })

  const order8342 = await prisma.order.findFirst({ where: { orderNumber: 'ERS-8342' } })
  if (!order8342) return NextResponse.json({ error: 'ERS-8342 not found' }, { status: 404 })

  const candidates = await prisma.payment.findMany({
    where: { orderId: order8342.id, amount: 478.43 },
  })
  if (candidates.length !== 2) {
    return NextResponse.json({ error: 'ERS-8342 expected 2 candidates, found ' + candidates.length }, { status: 500 })
  }
  await prisma.payment.update({
    where: { id: candidates[0].id },
    data: { createdAt: new Date('2026-06-10T12:00:00.000Z') },
  })
  await prisma.payment.update({
    where: { id: candidates[1].id },
    data: { createdAt: new Date('2026-07-01T12:00:00.000Z') },
  })

  return NextResponse.json({
    ers7833: { newAmountPaid: newAmountPaid7833, newBalanceDue: newBalanceDue7833 },
    ers8342: { updatedPaymentIds: [candidates[0].id, candidates[1].id] },
  })
}
