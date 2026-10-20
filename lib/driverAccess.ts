import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveRequestAuth } from '@/lib/marketing/adminAuth'
import { DRIVER_COOKIE_NAME, verifyDriverToken } from '@/lib/driverAuth'

export async function resolveDriverAccess(request: NextRequest) {
  const auth = await resolveRequestAuth(request)
  if (auth.isAdmin) return { isAdmin: true, driverId: null, name: auth.name || auth.username || 'Administrator', authMode: 'admin' as const }
  const driverId = verifyDriverToken(request.cookies.get(DRIVER_COOKIE_NAME)?.value)
  if (!driverId) return null
  const driver = await prisma.driver.findUnique({ where: { id: driverId }, select: { id: true, name: true, isActive: true } })
  if (!driver?.isActive) return null
  return { isAdmin: false, driverId: driver.id, name: driver.name, authMode: 'pin' as const }
}
