export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')

    const rainchecks = await prisma.raincheck.findMany({
          where: customerId ? { customerId } : undefined,
          include: { customer: { select: { firstName: true, lastName: true, email: true } } },
          orderBy: { issuedAt: 'desc' },
        })

    return NextResponse.json({ rainchecks })
  }

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { customerId, amount, reason, expiresAt } = await request.json()

    if (!customerId || !amount || Number(amount) <= 0) {
          return NextResponse.json({ error: 'customerId and a positive amount are required' }, { status: 400 })
        }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } })
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    const raincheck = await prisma.raincheck.create({
          data: {
                  customerId,
                  amount: Number(amount),
                  remainingAmount: Number(amount),
                  reason: reason || null,
                  expiresAt: expiresAt ? new Date(expiresAt) : null,
                },
        })

    return NextResponse.json({ raincheck })
  }
