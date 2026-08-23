export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function getOrCreateSettings() {
    let settings = await prisma.orderSettings.findFirst()
    if (!settings) {
          settings = await prisma.orderSettings.create({ data: {} })
        }
    return settings
  }

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const settings = await getOrCreateSettings()
    return NextResponse.json({ settings })
  }

export async function PATCH(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const existing = await getOrCreateSettings()

    const settings = await prisma.orderSettings.update({
          where: { id: existing.id },
          data: {
                  requireDamageWaiver: body.requireDamageWaiver,
                  allowOnlineOrders: body.allowOnlineOrders,
                  autoAcceptOrders: body.autoAcceptOrders,
                  minimumNoticeHours: body.minimumNoticeHours !== undefined ? parseInt(body.minimumNoticeHours) : undefined,
                  defaultDepositPercent: body.defaultDepositPercent !== undefined ? parseFloat(body.defaultDepositPercent) : undefined,
                  allowPartialPayments: body.allowPartialPayments,
                  requirePhoneNumber: body.requirePhoneNumber,
                  cancellationWindowHours: body.cancellationWindowHours !== undefined ? parseInt(body.cancellationWindowHours) : undefined,
                  reminderDaysBeforeDelivery: body.reminderDaysBeforeDelivery !== undefined ? parseInt(body.reminderDaysBeforeDelivery) : undefined,
                  reminderDaysBeforePickup: body.reminderDaysBeforePickup !== undefined ? parseInt(body.reminderDaysBeforePickup) : undefined,
                  reminderDaysBeforeBalance: body.reminderDaysBeforeBalance !== undefined ? parseInt(body.reminderDaysBeforeBalance) : undefined,
                },
        })

    return NextResponse.json({ settings })
  }
