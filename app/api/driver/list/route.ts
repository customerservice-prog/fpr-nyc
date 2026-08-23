export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Public endpoint (no admin session required) so the driver login screen
// can list active drivers to pick from. Only exposes id + name, never PIN,
// phone, or email.
export async function GET() {
  const drivers = await prisma.driver.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })
  return NextResponse.json({ drivers })
}
