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
  const data: { completed?: boolean; title?: string } = {}
  if (typeof body.completed === 'boolean') data.completed = body.completed
  if (typeof body.title === 'string') data.title = body.title

  const task = await prisma.task.update({
    where: { id: (await params).id },
    data,
  })
  return NextResponse.json({ task })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.task.delete({ where: { id: (await params).id } })
  return NextResponse.json({ success: true })
}
