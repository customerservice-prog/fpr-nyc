export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const surfaces = await prisma.setupSurface.findMany({ orderBy: { sortOrder: 'asc' } })
    return NextResponse.json({ surfaces })
  }

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const surface = await prisma.setupSurface.create({
          data: {
                  name: body.name,
                  isActive: body.isActive ?? true,
                  sortOrder: parseInt(body.sortOrder) || 0,
                },
        })

    return NextResponse.json({ surface })
  }

export async function PATCH(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const surface = await prisma.setupSurface.update({
          where: { id: body.id },
          data: {
                  name: body.name,
                  isActive: body.isActive,
                  sortOrder: body.sortOrder !== undefined ? parseInt(body.sortOrder) : undefined,
                },
        })

    return NextResponse.json({ surface })
  }

export async function DELETE(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    await prisma.setupSurface.delete({ where: { id } })
    return NextResponse.json({ success: true })
  }
