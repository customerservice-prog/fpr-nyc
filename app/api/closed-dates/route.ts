export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'

export async function GET() {
  const closedDates = await prisma.closedDate.findMany()
  const dates = closedDates.map((d) => format(new Date(d.date), 'yyyy-MM-dd'))
  return NextResponse.json({ dates })
}
