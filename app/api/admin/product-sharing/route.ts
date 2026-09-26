export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let settings = await prisma.productSharingSetting.findFirst()
  if (!settings) {
    settings = await prisma.productSharingSetting.create({
      data: { id: 'default_product_sharing' },
      })
    }
  return NextResponse.json({ settings })
  }

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  let settings = await prisma.productSharingSetting.findFirst()
  if (!settings) {
    settings = await prisma.productSharingSetting.create({ data: { id: 'default_product_sharing' } })
    }

  const data: Record<string, unknown> = {}
  if ('shareAcrossLocations' in body) data.shareAcrossLocations = body.shareAcrossLocations
  if ('notes' in body) data.notes = body.notes

  const updated = await prisma.productSharingSetting.update({ where: { id: settings.id }, data })
  return NextResponse.json({ settings: updated })
  }
