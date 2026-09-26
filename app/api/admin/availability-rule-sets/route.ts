export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const ruleSets = await prisma.availabilityRuleSet.findMany({
        orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ ruleSets })
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as any)?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    const ruleSet = await prisma.availabilityRuleSet.create({
        data: {
            name: body.name,
            startDate: body.startDate ? new Date(body.startDate) : null,
            endDate: body.endDate ? new Date(body.endDate) : null,
            maxQuantity: body.maxQuantity ? parseInt(body.maxQuantity) : null,
            minDaysNotice: body.minDaysNotice ? parseInt(body.minDaysNotice) : 0,
            isActive: body.isActive ?? true,
            notes: body.notes || null,
        },
    })
    return NextResponse.json({ ruleSet })
}

export async function PATCH(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as any)?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...data } = body

    if (data.startDate !== undefined) data.startDate = data.startDate ? new Date(data.startDate) : null
    if (data.endDate !== undefined) data.endDate = data.endDate ? new Date(data.endDate) : null
    if (data.maxQuantity !== undefined) data.maxQuantity = data.maxQuantity ? parseInt(data.maxQuantity) : null
    if (data.minDaysNotice !== undefined) data.minDaysNotice = parseInt(data.minDaysNotice) || 0

    const ruleSet = await prisma.availabilityRuleSet.update({
        where: { id },
        data,
    })
    return NextResponse.json({ ruleSet })
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

    await prisma.availabilityRuleSet.delete({ where: { id } })
    return NextResponse.json({ success: true })
}
