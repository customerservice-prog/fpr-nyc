export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyDriverToken, DRIVER_COOKIE_NAME } from '@/lib/driverAuth'

export async function GET(request: NextRequest) {
    const token = request.cookies.get(DRIVER_COOKIE_NAME)?.value
    const driverId = verifyDriverToken(token)
    if (!driverId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const driver = await prisma.driver.findUnique({
        where: { id: driverId },
        select: { id: true, name: true },
  })
    if (!driver) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ driver })
}
