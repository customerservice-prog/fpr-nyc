export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; itemId: string }> }
  ) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
    const item = await prisma.orderItem.update({
          where: { id: (await params).itemId },
          data: {
                  quantity: body.quantity,
              itemName: body.itemName,
                  unitPrice: body.unitPrice,
                  total: body.total,
                },
        })

    return NextResponse.json({ item })
  }
