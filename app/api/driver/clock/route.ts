export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyDriverToken, DRIVER_COOKIE_NAME } from '@/lib/driverAuth'

function getDriverId(request: NextRequest): string | null {
    const token = request.cookies.get(DRIVER_COOKIE_NAME)?.value
    return verifyDriverToken(token)
}

export async function GET(request: NextRequest) {
    const driverId = getDriverId(request)
    if (!driverId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)

  const openEntry = await prisma.driverTimeEntry.findFirst({
        where: { driverId, clockOut: null },
        orderBy: { clockIn: 'desc' },
  })

  const todayEntries = await prisma.driverTimeEntry.findMany({
        where: { driverId, clockIn: { gte: start, lt: end } },
        orderBy: { clockIn: 'desc' },
  })

  return NextResponse.json({ openEntry, todayEntries })
}

export async function POST(request: NextRequest) {
    const driverId = getDriverId(request)
    if (!driverId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.driverTimeEntry.findFirst({
        where: { driverId, clockOut: null },
  })
    if (existing) {
          return NextResponse.json({ error: 'Already clocked in' }, { status: 400 })
    }

  const entry = await prisma.driverTimeEntry.create({
        data: { driverId },
  })
    return NextResponse.json({ success: true, entry })
}

export async function PATCH(request: NextRequest) {
    const driverId = getDriverId(request)
    if (!driverId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.driverTimeEntry.findFirst({
        where: { driverId, clockOut: null },
        orderBy: { clockIn: 'desc' },
  })
    if (!existing) {
          return NextResponse.json({ error: 'Not clocked in' }, { status: 400 })
    }

  const entry = await prisma.driverTimeEntry.update({
        where: { id: existing.id },
        data: { clockOut: new Date() },
  })
    return NextResponse.json({ success: true, entry })
}
