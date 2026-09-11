export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function isAuthorized() {
  const session = await getServerSession(authOptions)
  return !!session && (session.user as any)?.role === 'admin'
}

export async function GET(request: NextRequest) {
  const authorized = await isAuthorized()
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orders = await prisma.order.findMany({
    include: { customer: true },
  })

  const data = orders.map((o) => ({
    n: o.orderNumber,
    f: o.customer ? o.customer.firstName : '',
    l: o.customer ? o.customer.lastName : '',
    s: o.eventDate ? o.eventDate.toISOString().slice(0, 10) : '',
    t: o.totalAmount,
    p: o.amountPaid,
    b: o.balanceDue,
  }))

  return NextResponse.json({ orders: data })
}
