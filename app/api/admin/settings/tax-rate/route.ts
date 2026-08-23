export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
    const existing = await prisma.taxRate.findFirst({ where: { isActive: true } })

  const rate = existing
      ? await prisma.taxRate.update({
                where: { id: existing.id },
                data: { rate: body.rate, isActive: body.isActive ?? true },
      })
        : await prisma.taxRate.create({
                  data: { rate: body.rate, isActive: true },
        })

  return NextResponse.json({ rate })
}
