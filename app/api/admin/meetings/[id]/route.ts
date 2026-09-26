export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const data: { completed?: boolean; notes?: string; zoomLink?: string } = {}
  if (typeof body.completed === 'boolean') data.completed = body.completed
  if (typeof body.notes === 'string') data.notes = body.notes
  if (typeof body.zoomLink === 'string') data.zoomLink = body.zoomLink

  const meeting = await prisma.meeting.update({
    where: { id: (await params).id },
    data,
  })
  return NextResponse.json({ meeting })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.meeting.delete({ where: { id: (await params).id } })
  return NextResponse.json({ success: true })
}
