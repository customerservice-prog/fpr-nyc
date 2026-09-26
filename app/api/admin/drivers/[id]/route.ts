export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name
  if (body.phone !== undefined) data.phone = body.phone
  if (body.email !== undefined) data.email = body.email
  if (body.vehicleInfo !== undefined) data.vehicleInfo = body.vehicleInfo
  if (body.notes !== undefined) data.notes = body.notes
  if (body.isActive !== undefined) data.isActive = body.isActive
    if (body.pin !== undefined) data.pin = body.pin || null

  const driver = await prisma.driver.update({
    where: { id: (await params).id },
    data,
    })
  return NextResponse.json({ driver })
  }

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.driver.update({
    where: { id: (await params).id },
    data: { isActive: false },
    })
  return NextResponse.json({ success: true })
  }
