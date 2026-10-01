export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isLegacySchedulingSpecialRequestFee } from '@/lib/publicSpecialRequestFees'

export async function GET() {
  const fees = await prisma.specialRequestFee.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })
  return NextResponse.json({ fees: fees.filter((fee) => !isLegacySchedulingSpecialRequestFee(fee.name)) })
}
