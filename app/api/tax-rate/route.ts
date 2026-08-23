export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const rate = await prisma.taxRate.findFirst({ where: { isActive: true } })
    return NextResponse.json({ rate: rate || { rate: 8, isActive: true } })
}
