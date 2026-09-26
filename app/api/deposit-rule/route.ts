export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const rule = await prisma.depositRule.findFirst({ where: { isActive: true } })
  return NextResponse.json({ rule })
}
