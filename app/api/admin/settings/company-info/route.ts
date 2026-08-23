export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = await prisma.companySettings.findFirst()
  return NextResponse.json({ settings })
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const existing = await prisma.companySettings.findFirst()

  const settings = existing
    ? await prisma.companySettings.update({ where: { id: existing.id }, data: body })
    : await prisma.companySettings.create({ data: body })

  return NextResponse.json({ settings })
}
