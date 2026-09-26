export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const references = await prisma.reference.findMany({ orderBy: { sortOrder: 'asc' } })
    return NextResponse.json({ references })
  }

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const reference = await prisma.reference.create({
          data: {
                  name: body.name,
                  isActive: body.isActive ?? true,
                  sortOrder: parseInt(body.sortOrder) || 0,
                },
        })

    return NextResponse.json({ reference })
  }

export async function PATCH(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const reference = await prisma.reference.update({
          where: { id: body.id },
          data: {
                  name: body.name,
                  isActive: body.isActive,
                  sortOrder: body.sortOrder !== undefined ? parseInt(body.sortOrder) : undefined,
                },
        })

    return NextResponse.json({ reference })
  }

export async function DELETE(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    await prisma.reference.delete({ where: { id } })
    return NextResponse.json({ success: true })
  }
