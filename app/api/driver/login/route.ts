export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createDriverToken, DRIVER_COOKIE_NAME, DRIVER_COOKIE_MAX_AGE } from '@/lib/driverAuth'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { driverId, pin } = body
  if (!driverId || !pin) {
    return NextResponse.json({ error: 'Driver and PIN are required' }, { status: 400 })
  }

  const driver = await prisma.driver.findUnique({ where: { id: driverId } })
  if (!driver || !driver.isActive || !driver.pin) {
    return NextResponse.json({ error: 'Invalid driver or PIN not set' }, { status: 401 })
  }
  if (driver.pin !== pin) {
    return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 })
  }

  const token = createDriverToken(driver.id)
  const response = NextResponse.json({ driver: { id: driver.id, name: driver.name } })
  response.cookies.set(DRIVER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: DRIVER_COOKIE_MAX_AGE,
  })
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(DRIVER_COOKIE_NAME, '', { path: '/', maxAge: 0 })
  return response
}
