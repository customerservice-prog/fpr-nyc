export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
  ) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const raincheck = await prisma.raincheck.findUnique({ where: { id: (await params).id } })
  if (!raincheck) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (raincheck.redeemedAt) {
    return NextResponse.json({ error: 'Cannot void a raincheck that has already been redeemed' }, { status: 400 })
    }

  await prisma.raincheck.delete({ where: { id: (await params).id } })
  return NextResponse.json({ success: true })
  }
