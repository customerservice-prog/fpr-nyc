export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const IMPORT_SECRET = 'frp-ers-migration-2026-temp'
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-import-secret',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

async function isAuthorized(request: NextRequest) {
  const secret = request.headers.get('x-import-secret')
  if (secret && secret === IMPORT_SECRET) return true
  const session = await getServerSession(authOptions)
  return !!session
}

export async function GET(request: NextRequest) {
  const authorized = await isAuthorized(request)
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS })
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

  return NextResponse.json({ orders: data }, { headers: CORS_HEADERS })
}
