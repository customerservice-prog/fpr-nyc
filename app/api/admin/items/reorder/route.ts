export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const itemIds: string[] = Array.isArray(body.itemIds) ? body.itemIds : []
  if (itemIds.length === 0) {
    return NextResponse.json({ error: 'itemIds is required' }, { status: 400 })
  }

  await prisma.$transaction(
    itemIds.map((id, index) =>
      prisma.item.update({ where: { id }, data: { sortOrder: index } })
    )
  )

  return NextResponse.json({ success: true })
}
