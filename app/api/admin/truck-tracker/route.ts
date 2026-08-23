export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const drivers = await prisma.driver.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  })

  const results = await Promise.all(
    drivers.map(async (driver) => {
      const latest = await prisma.driverLocation.findFirst({
        where: { driverId: driver.id },
        orderBy: { recordedAt: 'desc' },
      })
      return {
        id: driver.id,
        name: driver.name,
        vehicleInfo: driver.vehicleInfo,
        lat: latest?.lat ?? null,
        lng: latest?.lng ?? null,
        recordedAt: latest?.recordedAt ? latest.recordedAt.toISOString() : null,
      }
    })
  )

  return NextResponse.json({ drivers: results })
}
