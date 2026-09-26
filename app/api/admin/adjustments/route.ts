export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adjustments = await prisma.adjustment.findMany({
        orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json({ adjustments })
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as any)?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    const adjustment = await prisma.adjustment.create({
        data: {
            name: body.name,
            type: body.type || 'Percent',
            value: parseFloat(body.value) || 0,
            appliesTo: body.appliesTo || 'Order',
            isActive: body.isActive ?? true,
            sortOrder: body.sortOrder ? parseInt(body.sortOrder) : 0,
        },
    })
    return NextResponse.json({ adjustment })
}

export async function PATCH(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as any)?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...data } = body

    if (data.value !== undefined) data.value = parseFloat(data.value) || 0
    if (data.sortOrder !== undefined) data.sortOrder = parseInt(data.sortOrder) || 0

    const adjustment = await prisma.adjustment.update({
        where: { id },
        data,
    })
    return NextResponse.json({ adjustment })
}

export async function DELETE(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as any)?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    await prisma.adjustment.delete({ where: { id } })
    return NextResponse.json({ success: true })
}
