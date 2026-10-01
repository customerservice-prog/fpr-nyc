export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const season = searchParams.get('season')
  const category = searchParams.get('category')
  const eventType = searchParams.get('eventType')
  const brand = searchParams.get('brand')
  const where: any = {}
  if (season) where.seasonTags = { has: season }
  if (category) where.categoryTags = { has: category }
  if (eventType) where.eventTypeTags = { has: eventType }
  if (brand) where.brandTags = { has: brand }
  const items = await prisma.generalImage.findMany({ where, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ items })
  }

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const data = await request.json()
  const item = await prisma.generalImage.create({ data })
  return NextResponse.json({ item })
  }

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const data = await request.json()
  const { id, ...rest } = data
  const item = await prisma.generalImage.update({ where: { id }, data: rest })
  return NextResponse.json({ item })
  }

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await prisma.generalImage.delete({ where: { id } })
  return NextResponse.json({ success: true })
  }
