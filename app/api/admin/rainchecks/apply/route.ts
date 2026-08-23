export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

    const body = await request.json()
    const { raincheckId, orderId, amount } = body

    if (!raincheckId || !orderId || amount === undefined || amount === null || isNaN(parseFloat(amount)) || parseFloat(amount) < 0) {
          return NextResponse.json({ error: 'raincheckId, orderId, and a non-negative amount are required' }, { status: 400 })
        }

    const amountVal = Math.round(parseFloat(amount) * 100) / 100

    const raincheck = await prisma.raincheck.findUnique({ where: { id: raincheckId } })
    if (!raincheck) {
          return NextResponse.json({ error: 'Raincheck not found' }, { status: 404 })
        }

    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) {
          return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

    const previousAppliedToThisRaincheck = order.raincheckId === raincheckId ? (order.raincheckApplied || 0) : 0
    const availableRemaining = Math.round((raincheck.remainingAmount + previousAppliedToThisRaincheck) * 100) / 100

    if (amountVal > availableRemaining) {
          return NextResponse.json({ error: 'Amount exceeds remaining raincheck balance of dollar' + availableRemaining.toFixed(2) }, { status: 400 })
        }

    const newRemaining = Math.round((availableRemaining - amountVal) * 100) / 100

    const ops: any[] = []

    if (order.raincheckId && order.raincheckId !== raincheckId) {
          const oldRaincheck = await prisma.raincheck.findUnique({ where: { id: order.raincheckId } })
          if (oldRaincheck) {
                  const releasedAmount = order.raincheckApplied || 0
                  const oldNewRemaining = Math.round((oldRaincheck.remainingAmount + releasedAmount) * 100) / 100
                  ops.push(
                            prisma.raincheck.update({
                                        where: { id: order.raincheckId },
                                        data: {
                                                      remainingAmount: oldNewRemaining,
                                                      redeemedAt: null,
                                                      redeemedOrderId: null,
                                                    },
                                      })
                          )
                }
        }

    ops.push(
          prisma.raincheck.update({
                  where: { id: raincheckId },
                  data: {
                            remainingAmount: newRemaining,
                            redeemedOrderId: amountVal > 0 ? orderId : raincheck.redeemedOrderId,
                            redeemedAt: newRemaining <= 0 ? new Date() : null,
                          },
                })
        )

    ops.push(
          prisma.order.update({
                  where: { id: orderId },
                  data: {
                            raincheckId: amountVal > 0 ? raincheckId : null,
                            raincheckApplied: amountVal,
                          },
                })
        )

    await prisma.$transaction(ops)

    return NextResponse.json({ success: true, remainingAmount: newRemaining, appliedAmount: amountVal })
  }
