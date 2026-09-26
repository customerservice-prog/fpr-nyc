export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
const session = await getServerSession(authOptions)
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

try {
const items = await prisma.item.findMany({
select: { id: true, name: true, cost: true, taxable: true },
orderBy: { name: 'asc' },
})
return NextResponse.json({ items })
} catch (err) {
console.error('[virtual-assistant/catalog GET] failed:', err)
return NextResponse.json({ items: [], warning: 'catalog temporarily unavailable' })
}
}
