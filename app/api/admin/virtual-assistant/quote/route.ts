export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActiveTaxRatePercent } from '@/lib/nycCheckoutPricingServer'
import { resolveNycSalesTax } from '@/lib/nycSalesTax'

interface RequestedItem {
  itemName: string
  quantity: number
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const requestedItems: RequestedItem[] = body.items || []

  const matched: Array<{
    itemId: string
    itemName: string
    quantity: number
    unitPrice: number
    total: number
    taxable: boolean
  }> = []
  const unmatched: string[] = []

  for (const reqItem of requestedItems) {
    const name = (reqItem.itemName || '').trim()
    if (!name) continue
    const qty = Math.max(1, parseInt(String(reqItem.quantity)) || 1)

    const item = await prisma.item.findFirst({
      where: { name: { contains: name, mode: 'insensitive' } },
      orderBy: { name: 'asc' },
    })

    if (item) {
      matched.push({
        itemId: item.id,
        itemName: item.name,
        quantity: qty,
        unitPrice: item.cost,
        total: Math.round(item.cost * qty * 100) / 100,
        taxable: item.taxable,
      })
    } else {
      unmatched.push(name)
    }
  }

  const subtotal = Math.round(matched.reduce((sum, i) => sum + i.total, 0) * 100) / 100
  const taxableSubtotal = matched.filter((i) => i.taxable).reduce((sum, i) => sum + i.total, 0)

  // NYC sales tax depends on the delivery address (lib/nycSalesTax.ts). Use the delivery
  // ZIP when one is given, otherwise the staff default from Settings > Tax Rate. Never guess.
  const zipTax = typeof body.zip === 'string' ? resolveNycSalesTax(body.zip) : null
  const staffDefault = zipTax?.status === 'resolved' ? null : await getActiveTaxRatePercent()
  const taxRate: number | null = zipTax?.status === 'resolved' ? zipTax.ratePercent : staffDefault

  const taxAmount = taxRate === null ? 0 : Math.round(taxableSubtotal * (taxRate / 100) * 100) / 100
  const total = Math.round((subtotal + taxAmount) * 100) / 100

  return NextResponse.json({ items: matched, unmatched, subtotal, taxRate, taxAmount, total })
}
