export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
    request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
  ) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: orderId, contactId } = await params
    const existing = await prisma.orderContact.findUnique({ where: { id: contactId } })
    if (!existing || existing.orderId !== orderId) {
          return NextResponse.json({ error: 'Contact not found on this order' }, { status: 404 })
    }

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

  const contact = await prisma.orderContact.update({
        where: { id: contactId },
        data: {
                name,
                role,
                phone: phone || null,
                email: email || null,
                note: note || null,
        },
  })

  return NextResponse.json({ contact })
}

export async function DELETE(
    _request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
  ) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: orderId, contactId } = await params
    const existing = await prisma.orderContact.findUnique({ where: { id: contactId } })
    if (!existing || existing.orderId !== orderId) {
          return NextResponse.json({ error: 'Contact not found on this order' }, { status: 404 })
    }

  await prisma.orderContact.delete({ where: { id: contactId } })
    return NextResponse.json({ success: true })
}
