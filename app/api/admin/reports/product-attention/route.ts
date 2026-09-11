export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const items = await prisma.item.findMany({
    where: { status: { not: 'Available' } },
    include: { category: true },
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
  })

  const groups: Record<string, { id: string; name: string; category: string; attentionNotes: string | null; lastInspectedAt: string | null }[]> = {}

  for (const item of items) {
    const status = item.status || 'Unknown'
    if (!groups[status]) groups[status] = []
    groups[status].push({
      id: item.id,
      name: item.name,
      category: item.category?.name || 'Uncategorized',
      attentionNotes: item.attentionNotes,
      lastInspectedAt: item.lastInspectedAt ? item.lastInspectedAt.toISOString() : null,
    })
  }

  const statusOrder = ['Damaged', 'Needs Repair', 'Missing', 'Out of Service', 'Retired']
  const sortedStatuses = Object.keys(groups).sort((a, b) => {
    const ai = statusOrder.indexOf(a)
    const bi = statusOrder.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  const result = sortedStatuses.map((status) => ({
    status,
    items: groups[status],
  }))

  return NextResponse.json({ groups: result, totalCount: items.length })
}
