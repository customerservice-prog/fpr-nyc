export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Read-only diagnostic: list every payment recorded in July 2026 along with
// its order, to identify duplicate or erroneous payment records causing the
// Tax Report to overcount revenue for the month. Does not modify any data.
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as { role?: string }).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const start = new Date(Date.UTC(2026, 6, 1))
    const end = new Date(Date.UTC(2026, 7, 1))

    const payments = await prisma.payment.findMany({
          where: { createdAt: { gte: start, lt: end } },
          include: {
                  order: {
                            select: { orderNumber: true, eventCity: true, eventState: true },
                          },
                },
          orderBy: [{ orderId: 'asc' }, { createdAt: 'asc' }],
        })

    const rows = payments.map((p) => ({
          id: p.id,
          orderId: p.orderId,
          orderNumber: p.order?.orderNumber ?? null,
          city: p.order?.eventCity ?? null,
          state: p.order?.eventState ?? null,
          amount: p.amount,
          method: p.method,
          status: p.status,
          notes: p.notes,
          createdAt: p.createdAt,
        }))

    return NextResponse.json({ count: rows.length, payments: rows })
  }
