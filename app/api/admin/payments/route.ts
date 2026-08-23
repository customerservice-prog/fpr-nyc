export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { finalizePayment } from '@/lib/payments'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

const { orderId, amount, method, notes, skipEmail } = await request.json()

try {
  const updated = await finalizePayment({
    orderId,
    amount: parseFloat(amount),
    method: method || 'card',
    notes,
    recordedByName: session.user?.name || null, skipEmail,
  })
  return NextResponse.json({ order: updated })
} catch (error) {
  console.error('Admin payment error:', error)
  return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
}
}
