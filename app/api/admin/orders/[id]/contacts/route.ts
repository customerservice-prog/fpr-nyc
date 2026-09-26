export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Additional contacts that belong to a single order only (Day-Of Contact,
// Secondary Contact, Billing Contact, etc.) - separate from the Customer's
// own primary/secondary contact fields. Never overwrites the Customer record.

export async function GET(
    _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
  ) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orderId = (await params).id
    const contacts = await prisma.orderContact.findMany({
          where: { orderId },
          orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ contacts })
}

export async function POST(
    request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
  ) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orderId = (await params).id
    const body = await request.json()
    const name = (body.name || '').trim()
    const phone = (body.phone || '').trim()
    const email = (body.email || '').trim()
    const role = (body.role || 'Other').trim() || 'Other'
    const note = (body.note || '').trim()

  if (!name) {
        return NextResponse.json({ error: 'Contact name is required' }, { status: 400 })
  }
    if (!phone && !email) {
          return NextResponse.json({ error: 'Enter a phone number or email for this contact' }, { status: 400 })
    }

  const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const contact = await prisma.orderContact.create({
        data: {
                orderId,
                name,
                role,
                phone: phone || null,
                email: email || null,
                note: note || null,
        },
  })

  return NextResponse.json({ contact })
}
