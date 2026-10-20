export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Read-only diagnostic. Does not charge, refund, or email anyone.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const since = new Date(Date.now() - 72 * 60 * 60 * 1000)
  const payments = await prisma.payment.findMany({
    where: { createdAt: { gte: since } },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          customer: { select: { firstName: true, lastName: true, email: true, phone: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 150,
  })
  const alertKeys = payments.map(p => 'payment:' + p.id)
  const alerts = await prisma.staffEmailNotification.findMany({
    where: { eventKey: { in: alertKeys } },
    select: { eventKey: true, status: true, lastError: true, sentAt: true, createdAt: true },
  })
  const alertByKey = new Map(alerts.map(a => [a.eventKey, a]))
  const recent = payments.map(p => {
    const alert = alertByKey.get('payment:' + p.id)
    return {
      amount: p.amount,
      status: p.status,
      paidAt: p.createdAt.toISOString(),
      paymentMethod: p.method,
      stripeProcessed: Boolean(p.stripePaymentId),
      recordedBy: p.recordedByName || null,
      orderId: p.orderId,
      orderNumber: p.order?.orderNumber || null,
      customer: p.order?.customer
        ? {
            name: [p.order.customer.firstName, p.order.customer.lastName].filter(Boolean).join(' '),
            email: p.order.customer.email,
            phone: p.order.customer.phone,
          }
        : null,
      officeAlert: alert
        ? { status: alert.status, sentAt: alert.sentAt?.toISOString() || null, error: alert.lastError }
        : { status: 'no-ledger-alert', sentAt: null, error: null },
    }
  })
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    note: 'Read-only payment ledger audit. A missing alert record is not proof an email was never delivered.',
    target31212: recent.filter(p => Math.round(p.amount * 100) === 31212),
    recentPayments: recent,
  }, { headers: { 'Cache-Control': 'private, no-store' } })
}
