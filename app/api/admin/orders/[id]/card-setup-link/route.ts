export const dynamic = 'force-dynamic'

import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hashCardSetupToken } from '@/lib/cardSetup'
import { canProcessPayments } from '@/lib/staffPermissions'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canProcessPayments((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: 'This staff role cannot manage payment cards.' }, { status: 403 })
  }

  const { id } = await params
  const order = await prisma.order.findUnique({ where: { id }, select: { id: true, status: true } })
  if (!order || ['canceled', 'cancelled'].includes(order.status)) {
    return NextResponse.json({ error: 'Order unavailable' }, { status: 404 })
  }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await prisma.order.update({
    where: { id },
    data: {
      cardSetupTokenHash: hashCardSetupToken(token),
      cardSetupTokenExpiresAt: expiresAt,
    },
  })

  return NextResponse.json(
    { path: `/save-card/${encodeURIComponent(id)}?token=${token}`, expiresAt },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
