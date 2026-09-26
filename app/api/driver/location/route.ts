export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyDriverToken, DRIVER_COOKIE_NAME } from '@/lib/driverAuth'

export async function POST(request: NextRequest) {
  const token = request.cookies.get(DRIVER_COOKIE_NAME)?.value
  const driverId = verifyDriverToken(token)
  if (!driverId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { lat, lng } = body
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
  }

  await prisma.driverLocation.create({
    data: { driverId, lat, lng },
  })

  return NextResponse.json({ success: true })
}
