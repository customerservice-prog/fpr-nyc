export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { removePayment } from '@/lib/payments'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const updated = await removePayment((await params).id)
    return NextResponse.json({ order: updated })
  } catch (error) {
    console.error('Admin payment delete error:', error)
    return NextResponse.json({ error: 'Failed to remove payment' }, { status: 500 })
  }
}
