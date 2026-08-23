export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const order = await prisma.order.findUnique({ where: { id: (await params).id } })
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const updated = await prisma.order.update({
    where: { id: (await params).id },
    data: {
      status: order.status === 'quote' ? 'pending' : order.status,
    },
    include: { customer: true, items: true, payments: true },
  })

  return NextResponse.json({ success: true, order: updated })
}
