export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')

  const settings = await prisma.systemSetting.findMany({
    where: category ? { category } : undefined,
    orderBy: { key: 'asc' },
    })
  return NextResponse.json({ settings })
  }

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const setting = await prisma.systemSetting.upsert({
    where: { category_key: { category: body.category, key: body.key } },
    update: { value: body.value },
    create: { category: body.category, key: body.key, value: body.value },
    })
  return NextResponse.json({ setting })
  }

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const items: { category: string; key: string; value: string }[] = body.items || []

  const results = []
  for (const item of items) {
    const setting = await prisma.systemSetting.upsert({
      where: { category_key: { category: item.category, key: item.key } },
      update: { value: item.value },
      create: { category: item.category, key: item.key, value: item.value },
      })
    results.push(setting)
    }
  return NextResponse.json({ settings: results })
  }
