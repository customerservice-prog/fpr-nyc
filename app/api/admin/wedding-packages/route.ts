export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const packages = await prisma.weddingPackage.findMany({
        orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json(packages)
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const pkg = await prisma.weddingPackage.create({
        data: {
            name: body.name,
            description: body.description || null,
            price: Number(body.price) || 0,
            guests: Number(body.guests) || 0,
            image: body.image || null,
            items: body.items || [],
            popular: !!body.popular,
            signature: !!body.signature,
            sortOrder: Number(body.sortOrder) || 0,
            isActive: body.isActive !== undefined ? !!body.isActive : true,
        },
    })
    return NextResponse.json(pkg)
}
