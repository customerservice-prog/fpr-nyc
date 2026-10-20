export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasStaffPermission } from '@/lib/staffPermissions'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasStaffPermission((session.user as { role?: string }).role, 'customers')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const windowStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000)
  const [failed, stuckSending, recent] = await Promise.all([
    prisma.staffEmailNotification.count({
      where: { status: 'failed', createdAt: { gte: windowStart } },
    }),
    prisma.staffEmailNotification.count({
      where: { status: 'sending', updatedAt: { lte: staleBefore }, createdAt: { gte: windowStart } },
    }),
    prisma.staffEmailNotification.findMany({
      where: {
        createdAt: { gte: windowStart },
        OR: [
          { status: 'failed' },
          { status: 'sending', updatedAt: { lte: staleBefore } },
        ],
      },
      select: {
        id: true, kind: true, orderId: true, subject: true,
        status: true, attempts: true, lastError: true, updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 8,
    }),
  ])
  return NextResponse.json({ failed, stuckSending, recent }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
