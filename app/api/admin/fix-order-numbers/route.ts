export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// NOTE: the previous x-import-secret bypass has been removed. This route now
// requires an authenticated admin session, matching the other one-time fix
// routes in this directory. ERS migration access is no longer needed.
async function isAuthorized(request: NextRequest) {
    const session = await getServerSession(authOptions)
    return !!session && (session.user as any)?.role === 'admin'
}

export async function POST(request: NextRequest) {
    const authorized = await isAuthorized(request)
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
    const fixes = body.fixes || []
        let updated = 0
    let notFound = 0
    let ambiguous = 0
    const errors: any[] = []

        for (const f of fixes) {
              try {
                      const candidates = await prisma.order.findMany({
                                where: {
                                            totalAmount: f.totalAmount,
                                            eventDate: new Date(f.eventDate),
                                            customer: {
                                                          firstName: { equals: f.firstName, mode: 'insensitive' },
                                                          lastName: { equals: f.lastName, mode: 'insensitive' },
                                            },
                                },
                      })
                      let target = null
                      if (candidates.length === 1) {
                                target = candidates[0]
                      } else if (candidates.length > 1) {
                                const broken = candidates.filter((c: any) => !c.orderNumber || c.orderNumber.includes('undefined'))
                                if (broken.length === 1) target = broken[0]
                      }

                if (target) {
                          await prisma.order.update({
                                      where: { id: target.id },
                                      data: { orderNumber: 'ERS-' + f.ersOrderId },
                          })
                          updated++
                } else if (candidates.length === 0) {
                          notFound++
                          errors.push({ f, reason: 'not found' })
                } else {
                          ambiguous++
                          errors.push({ f, reason: 'ambiguous', count: candidates.length })
                }
              } catch (e: any) {
                      errors.push({ f, error: e.message })
              }
        }

  return NextResponse.json({ updated, notFound, ambiguous, errors })
}
