export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const messages = await prisma.automaticMessage.findMany({ orderBy: { createdAt: 'asc' } })
    return NextResponse.json({ messages })
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as any)?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const message = await prisma.automaticMessage.create({
        data: {
            name: body.name,
            daysToSend: parseInt(body.daysToSend) || 0,
            sendOption: body.sendOption || 'Before Order Starts',
            fromEmail: body.fromEmail || null,
            subject: body.subject,
            content: body.content,
            filter: body.filter || 'Active Only',
            enabled: body.enabled ?? true,
        },
    })

    return NextResponse.json({ message })
}

export async function PATCH(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as any)?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const message = await prisma.automaticMessage.update({
        where: { id: body.id },
        data: {
            name: body.name,
            daysToSend: body.daysToSend !== undefined ? parseInt(body.daysToSend) : undefined,
            sendOption: body.sendOption,
            fromEmail: body.fromEmail,
            subject: body.subject,
            content: body.content,
            filter: body.filter,
            enabled: body.enabled,
        },
    })

    return NextResponse.json({ message })
}

export async function DELETE(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as any)?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    await prisma.automaticMessage.delete({ where: { id } })
    return NextResponse.json({ success: true })
}
