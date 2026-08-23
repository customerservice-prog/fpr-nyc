export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const addons = await prisma.addon.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json({ addons })
  }

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const addon = await prisma.addon.create({
    data: {
      name: body.name,
      description: body.description,
      price: parseFloat(body.price) || 0,
      isActive: body.isActive ?? true,
      },
    })
  return NextResponse.json({ addon })
  }

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const data: Record<string, unknown> = {}
  if ('name' in body) data.name = body.name
  if ('description' in body) data.description = body.description
  if ('price' in body) data.price = parseFloat(body.price)
  if ('isActive' in body) data.isActive = body.isActive

  const addon = await prisma.addon.update({ where: { id: body.id }, data })
  return NextResponse.json({ addon })
  }

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await prisma.addon.delete({ where: { id } })
  return NextResponse.json({ success: true })
  }
