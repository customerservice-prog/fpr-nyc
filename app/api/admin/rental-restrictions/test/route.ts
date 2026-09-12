export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { evaluateRentalRestrictions, normalizeEmail, normalizePhone, normalizeAddress } from '@/lib/rentalRestrictions'

// POST /api/admin/rental-restrictions/test
// Admin-only debugging tool: run the exact same matching logic checkout
// uses, without placing a real order. Also reused by the "Add Restriction"
// form to warn staff when a value they are about to add already matches an
// active restriction. Never exposed to the public site.
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
    const address = body.street1 || body.city || body.state || body.zip
      ? { street1: body.street1, unit: body.unit, city: body.city, state: body.state, zip: body.zip }
          : null

  const result = await evaluateRentalRestrictions({
        customerId: body.customerId || null,
        emails: body.email ? [body.email] : [],
        phones: body.phone ? [body.phone] : [],
        address,
  })

  return NextResponse.json({
        ...result,
        normalized: {
                email: body.email ? normalizeEmail(body.email) : null,
                phone: body.phone ? normalizePhone(body.phone) : null,
                address: address ? normalizeAddress(address) : null,
        },
  })
}
