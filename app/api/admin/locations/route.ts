export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const locations = await prisma.location.findMany({
    orderBy: { name: 'asc' },
    })
  return NextResponse.json({ locations })
  }

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const location = await prisma.location.create({
    data: {
      name: body.name,
      address: body.address || null,
      city: body.city || null,
      state: body.state || null,
      zip: body.zip || null,
      phone: body.phone || null,
      isActive: body.isActive ?? true,
      isDefault: body.isDefault ?? false,
      },
    })
  return NextResponse.json({ location })
  }

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, ...data } = body

  const location = await prisma.location.update({
    where: { id },
    data,
    })
  return NextResponse.json({ location })
  }

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await prisma.location.delete({ where: { id } })
  return NextResponse.json({ success: true })
  }
