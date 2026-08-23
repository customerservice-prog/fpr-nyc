export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const integrations = await prisma.integrationConnection.findMany({
    orderBy: { provider: 'asc' },
    })
  return NextResponse.json({ integrations })
  }

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { provider, ...data } = body

  const integration = await prisma.integrationConnection.upsert({
    where: { provider },
    update: data,
    create: { provider, ...data },
    })
  return NextResponse.json({ integration })
  }
