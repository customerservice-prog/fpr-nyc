export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as { role?: string }).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const searchParams = request.nextUrl.searchParams
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10)
  const monthParam = searchParams.get('month')
  const quarterParam = searchParams.get('quarter')

  let start: Date
  let end: Date
  if (monthParam) {
    const month = parseInt(monthParam, 10)
    start = new Date(Date.UTC(year, month - 1, 1))
    end = new Date(Date.UTC(year, month, 1))
  } else if (quarterParam) {
    const q = parseInt(quarterParam, 10)
    start = new Date(Date.UTC(year, (q - 1) * 3, 1))
    end = new Date(Date.UTC(year, q * 3, 1))
  } else {
    start = new Date(Date.UTC(year, 0, 1))
    end = new Date(Date.UTC(year + 1, 0, 1))
  }

  const payments = await prisma.payment.findMany({
    where: { createdAt: { gte: start, lt: end } },
    include: {
      order: {
        select: {
          orderNumber: true,
          eventCity: true,
          eventState: true,
          subtotal: true,
          taxAmount: true,
          taxRate: true,
          totalAmount: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  type CityBucket = {
    city: string
    state: string
    count: number
    amountPaid: number
    paidNontaxable: number
    paidTaxable: number
    paidTax: number
  }

  const cityMap = new Map<string, CityBucket>()

  for (const p of payments) {
    const order = p.order
    if (!order) continue
    const city = order.eventCity || 'Unknown'
    const state = order.eventState || ''
    const key = city + '|' + state
    const total = order.totalAmount || 0
    const taxableRatio = total > 0 ? (order.subtotal || 0) / total : 0
    const taxRatio = total > 0 ? (order.taxAmount || 0) / total : 0
    const nontaxableRatio = Math.max(0, 1 - taxableRatio - taxRatio)

    const paidTaxable = p.amount * taxableRatio
    const paidTax = p.amount * taxRatio
    const paidNontaxable = p.amount * nontaxableRatio

    if (!cityMap.has(key)) {
      cityMap.set(key, {
        city,
        state,
        count: 0,
        amountPaid: 0,
        paidNontaxable: 0,
        paidTaxable: 0,
        paidTax: 0,
      })
    }
    const bucket = cityMap.get(key)!
    bucket.count += 1
    bucket.amountPaid += p.amount
    bucket.paidNontaxable += paidNontaxable
    bucket.paidTaxable += paidTaxable
    bucket.paidTax += paidTax
  }

  const cities = Array.from(cityMap.values()).sort((a, b) => a.city.localeCompare(b.city))

  const totals = cities.reduce(
    (acc, c) => ({
      count: acc.count + c.count,
      amountPaid: acc.amountPaid + c.amountPaid,
      paidNontaxable: acc.paidNontaxable + c.paidNontaxable,
      paidTaxable: acc.paidTaxable + c.paidTaxable,
      paidTax: acc.paidTax + c.paidTax,
    }),
    { count: 0, amountPaid: 0, paidNontaxable: 0, paidTaxable: 0, paidTax: 0 }
  )

  return NextResponse.json({
    cities,
    totals,
    year,
    month: monthParam ? parseInt(monthParam, 10) : null,
    quarter: quarterParam ? parseInt(quarterParam, 10) : null,
  })
}
