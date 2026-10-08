export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { describeStripeError, isNycPaymentsUnavailable, requireNycStripe } from '@/lib/stripe'
import { canProcessPayments } from '@/lib/staffPermissions'
import { collectNycSavedCardCharge, NycSavedCardChargeError } from '@/lib/nycSavedCardCharges'

const CHARGE_TYPES = new Set(['damage', 'missing_item', 'unreturned_item', 'cleaning', 'late_fee', 'other'])

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canProcessPayments((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: 'This staff role cannot charge cards.' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const amount = Math.round(Number(body.amount) * 100) / 100
    const reason = String(body.reason || '').trim().slice(0, 500)
    const addToOrderTotal = body.addToOrderTotal === true
    const chargeType = addToOrderTotal ? String(body.chargeType || '') : 'balance'
    const requestKey = String(body.requestKey || '')

    if (addToOrderTotal && !CHARGE_TYPES.has(chargeType)) {
      return NextResponse.json({ error: 'Choose a valid charge type.' }, { status: 400 })
    }

    const stripe = await requireNycStripe('charge')
    const result = await collectNycSavedCardCharge(stripe, {
      orderId: id,
      requestKey,
      amount,
      reason,
      addToOrderTotal,
      type: chargeType,
      createdByName: session.user?.name || 'NYC staff',
    })

    return NextResponse.json(result, {
      status: result.success ? 200 : result.status === 'processing' ? 202 : 400,
    })
  } catch (error) {
    if (isNycPaymentsUnavailable(error)) {
      console.error('[charge-saved-card] Blocked:', error.reason)
      return NextResponse.json({ error: 'Card charges are disabled until NYC Stripe is fully configured and online payments are enabled.' }, { status: 503 })
    }
    console.error('[charge-saved-card]', error instanceof NycSavedCardChargeError ? error.message : describeStripeError(error))
    return NextResponse.json(
      { error: error instanceof NycSavedCardChargeError ? error.message : 'Could not complete the charge. Check payment history before retrying.' },
      { status: error instanceof NycSavedCardChargeError ? error.status : 500 },
    )
  }
}
