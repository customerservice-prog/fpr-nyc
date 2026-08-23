export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const existing = await prisma.depositRule.findFirst({ where: { isActive: true } })

  const rule = existing
    ? await prisma.depositRule.update({
        where: { id: existing.id },
        data: { type: body.type, amount: body.amount, isActive: body.isActive ?? true },
      })
    : await prisma.depositRule.create({
        data: { type: body.type, amount: body.amount, isActive: true },
      })

  return NextResponse.json({ rule })
}
