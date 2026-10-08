export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasStaffPermission } from '@/lib/staffPermissions'
import { prisma } from '@/lib/prisma'
import { NYC_PUBLIC_ORIGIN } from '@/lib/nycPublicOrigin'
import { customerContractUrl, customerPayUrl } from '@/lib/publicOrderAccess'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session || !hasStaffPermission(role, 'orders')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, eventDate: true },
  })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  return NextResponse.json({
    payUrl: customerPayUrl(NYC_PUBLIC_ORIGIN, order.id, order.eventDate),
    contractUrl: customerContractUrl(NYC_PUBLIC_ORIGIN, order.id, order.eventDate),
  }, { headers: { 'Cache-Control': 'no-store' } })
}
