export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeUtf8 } from '@/lib/sanitizeUtf8'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const items = await prisma.item.findMany({
      include: { category: true },
      orderBy: { name: 'asc' },
      })
    const extras = await prisma.itemExtra.findMany()
    const extrasByItemId: Record<string, { sortOrder: number; costOfGoods: number }> = {}
    for (const extra of extras) {
      extrasByItemId[extra.itemId] = { sortOrder: extra.sortOrder, costOfGoods: extra.costOfGoods }
      }

    const merged = items.map((item) => ({
      ...item,
      sortOrder: extrasByItemId[item.id]?.sortOrder ?? 0,
      costOfGoods: extrasByItemId[item.id]?.costOfGoods ?? 0,
      }))

    return NextResponse.json(sanitizeUtf8({ items: merged }))
  } catch (err) {
    console.error('[item-extras GET] failed:', err)
    return NextResponse.json({ error: 'item-extras failed', detail: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
  }

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (!body.itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 })

  const data: Record<string, unknown> = {}
  if ('sortOrder' in body) data.sortOrder = parseInt(body.sortOrder)
  if ('costOfGoods' in body) data.costOfGoods = parseFloat(body.costOfGoods)

  const existing = await prisma.itemExtra.findUnique({ where: { itemId: body.itemId } })
  let extra
  if (existing) {
    extra = await prisma.itemExtra.update({ where: { itemId: body.itemId }, data })
    } else {
    extra = await prisma.itemExtra.create({
      data: {
        itemId: body.itemId,
        sortOrder: body.sortOrder ? parseInt(body.sortOrder) : 0,
        costOfGoods: body.costOfGoods ? parseFloat(body.costOfGoods) : 0,
        },
      })
    }
  return NextResponse.json({ extra })
  }
