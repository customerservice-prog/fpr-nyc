export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
    const { code, subtotal } = await request.json()

  if (!code) {
        return NextResponse.json({ valid: false, message: 'No coupon code provided' }, { status: 400 })
  }

  const coupon = await prisma.coupon.findUnique({ where: { code: String(code).toUpperCase().trim() } })

  if (!coupon || !coupon.isActive) {
        return NextResponse.json({ valid: false, message: 'Invalid coupon code' })
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        return NextResponse.json({ valid: false, message: 'This coupon has expired' })
  }

  const sub = parseFloat(subtotal) || 0
    const discount =
          coupon.discountType === 'percentage'
        ? Math.round(sub * (coupon.discountAmount / 100) * 100) / 100
            : Math.min(coupon.discountAmount, sub)

  return NextResponse.json({
        valid: true,
        code: coupon.code,
        discountType: coupon.discountType,
        discountAmount: coupon.discountAmount,
        discount,
        message: `Coupon applied: ${coupon.discountType === 'percentage' ? coupon.discountAmount + '%' : '$' + coupon.discountAmount} off`,
  })
}
