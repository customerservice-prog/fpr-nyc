export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let settings = await prisma.autoChargeSettings.findFirst()
  if (!settings) {
    settings = await prisma.autoChargeSettings.create({
      data: { id: 'default_auto_charge' },
      })
    }
  return NextResponse.json({ settings })
  }

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  let settings = await prisma.autoChargeSettings.findFirst()
  if (!settings) {
    settings = await prisma.autoChargeSettings.create({ data: { id: 'default_auto_charge' } })
    }

  const data: Record<string, unknown> = {}
  if ('enabled' in body) data.enabled = body.enabled
  if ('daysBeforeEvent' in body) data.daysBeforeEvent = parseInt(body.daysBeforeEvent)
  if ('chargeRemainingBalance' in body) data.chargeRemainingBalance = body.chargeRemainingBalance
  if ('notifyCustomer' in body) data.notifyCustomer = body.notifyCustomer

  const updated = await prisma.autoChargeSettings.update({ where: { id: settings.id }, data })
  return NextResponse.json({ settings: updated })
  }
