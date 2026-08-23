export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
const session = await getServerSession(authOptions)
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

const companyRoles = await prisma.companyRole.findMany({
orderBy: { sortOrder: 'asc' },
})
return NextResponse.json({ companyRoles })
}

export async function POST(request: NextRequest) {
const session = await getServerSession(authOptions)
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

const body = await request.json()

const companyRole = await prisma.companyRole.create({
data: {
name: body.name,
sortOrder: body.sortOrder ? parseInt(body.sortOrder) : 0,
isActive: body.isActive ?? true,
},
})
return NextResponse.json({ companyRole })
}

export async function PATCH(request: NextRequest) {
const session = await getServerSession(authOptions)
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

const body = await request.json()
const { id, ...data } = body
if (data.sortOrder !== undefined) data.sortOrder = parseInt(data.sortOrder) || 0

const companyRole = await prisma.companyRole.update({
where: { id },
data,
})
return NextResponse.json({ companyRole })
}

export async function DELETE(request: NextRequest) {
const session = await getServerSession(authOptions)
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

const { searchParams } = new URL(request.url)
const id = searchParams.get('id')
if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

await prisma.companyRole.delete({ where: { id } })
return NextResponse.json({ success: true })
}
