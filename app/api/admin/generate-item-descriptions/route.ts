export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeUtf8 } from '@/lib/sanitizeUtf8'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const items = await prisma.item.findMany({ include: { category: true } })
    const missing = items.filter((i) => !i.description || i.description.trim() === '')

    let updated = 0
    const updatedList: { id: string; name: string; description: string }[] = []

    for (const item of missing) {
      const categoryName = item.category?.name || 'party rental'
      const description = `Rent the ${item.name} in Riverdale, NY from Friendly Party Rental NYC. This ${categoryName.toLowerCase()} item is perfect for weddings, birthdays, graduations, and other special events. Starting at $${item.cost.toFixed(2)}/day. Serving Greenville and the surrounding Downstate New York area — reserve yours online today!`
      await prisma.item.update({
        where: { id: item.id },
        data: { description },
      })
      updated++
      updatedList.push({ id: item.id, name: item.name, description })
    }

    return NextResponse.json(sanitizeUtf8({
      totalItems: items.length,
      totalMissing: missing.length,
      updated,
      updatedList,
    }))
  } catch (err) {
    console.error('[generate-item-descriptions GET] failed:', err)
    return NextResponse.json({ error: 'generate-item-descriptions failed', detail: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
