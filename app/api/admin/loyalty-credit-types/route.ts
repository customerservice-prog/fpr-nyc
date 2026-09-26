export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const types = await prisma.loyaltyCreditType.findMany({ orderBy: { createdAt: 'asc' } })
    return NextResponse.json({ types })
  }

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const type = await prisma.loyaltyCreditType.create({
          data: {
                  name: body.name,
                  type: body.type || 'Credit',
                  amount: parseFloat(body.amount) || 0,
                  isActive: body.isActive ?? true,
                },
        })

    return NextResponse.json({ type })
  }

export async function PATCH(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const type = await prisma.loyaltyCreditType.update({
          where: { id: body.id },
          data: {
                  name: body.name,
                  type: body.type,
                  amount: body.amount !== undefined ? parseFloat(body.amount) : undefined,
                  isActive: body.isActive,
                },
        })

    return NextResponse.json({ type })
  }

export async function DELETE(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    await prisma.loyaltyCreditType.delete({ where: { id } })
    return NextResponse.json({ success: true })
  }
