export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const registers = await prisma.registerSetup.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json({ registers })
  }

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const register = await prisma.registerSetup.create({
    data: {
      name: body.name,
      location: body.location,
      isActive: body.isActive ?? true,
      },
    })
  return NextResponse.json({ register })
  }

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const data: Record<string, unknown> = {}
  if ('name' in body) data.name = body.name
  if ('location' in body) data.location = body.location
  if ('isActive' in body) data.isActive = body.isActive

  const register = await prisma.registerSetup.update({ where: { id: body.id }, data })
  return NextResponse.json({ register })
  }

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await prisma.registerSetup.delete({ where: { id } })
  return NextResponse.json({ success: true })
  }
