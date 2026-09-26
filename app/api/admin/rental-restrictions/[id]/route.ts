export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildIdentifierRecord } from '@/lib/rentalRestrictions'

// GET /api/admin/rental-restrictions/[id] - full case detail, including
// identifiers and (best-effort) any orders currently on the books for the
// linked source customer, so staff can see "creating this will not cancel
// these existing orders" context.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
    const restriction = await prisma.rentalRestriction.findUnique({
          where: { id },
          include: { identifiers: true },
    })
    if (!restriction) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let relatedFutureOrders: { id: string; orderNumber: string; eventDate: Date; status: string }[] = []
      if (restriction.sourceCustomerId) {
            relatedFutureOrders = await prisma.order.findMany({
                    where: { customerId: restriction.sourceCustomerId, status: { not: 'canceled' }, eventDate: { gte: new Date() } },
                    select: { id: true, orderNumber: true, eventDate: true, status: true },
                    orderBy: { eventDate: 'asc' },
            })
      }

  return NextResponse.json({ restriction, relatedFutureOrders })
}

// PATCH /api/admin/rental-restrictions/[id]
// Handles edits (reason/notes/expiry) and deactivation. Restrictions are
// never hard-deleted so history is preserved - deactivating requires a
// reason and records who/when, per the "keep the why" requirement.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
    const body = await request.json()
    const byName = (session.user as { name?: string } | undefined)?.name || undefined

  if (body.action === 'deactivate') {
        if (!body.reason) return NextResponse.json({ error: 'A reason is required to remove an active restriction' }, { status: 400 })
        const restriction = await prisma.rentalRestriction.update({
                where: { id },
                data: { status: 'INACTIVE', deactivatedAt: new Date(), deactivatedByName: byName || null, deactivationReason: body.reason },
        })
        return NextResponse.json({ restriction })
  }

  if (body.action === 'reactivate') {
        const restriction = await prisma.rentalRestriction.update({
                where: { id },
                data: { status: 'ACTIVE', deactivatedAt: null, deactivatedByName: null, deactivationReason: null },
        })
        return NextResponse.json({ restriction })
  }

  // Default: edit reason / notes / expiry only.
  const restriction = await prisma.rentalRestriction.update({
        where: { id },
        data: {
                reasonCategory: body.reasonCategory || undefined,
                internalNotes: body.internalNotes !== undefined ? body.internalNotes : undefined,
                expiresAt: body.expiresAt !== undefined ? (body.expiresAt ? new Date(body.expiresAt) : null) : undefined,
        },
  })
    return NextResponse.json({ restriction })
}

// POST /api/admin/rental-restrictions/[id] - add an identifier to an
// existing case (e.g. staff learns of a second phone number later).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
    const body = await request.json()
    const record = buildIdentifierRecord(body)
    if (!record) return NextResponse.json({ error: 'That identifier is not valid' }, { status: 400 })

  const identifier = await prisma.rentalRestrictionIdentifier.create({
        data: { ...record, restrictionId: id },
  })
    return NextResponse.json({ identifier })
}

// DELETE /api/admin/rental-restrictions/[id]?identifierId=... - remove ONE
// identifier from a case without deactivating the whole restriction (e.g.
// the address should no longer be restricted but the customer still is).
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await params
    const identifierId = request.nextUrl.searchParams.get('identifierId')
    if (!identifierId) return NextResponse.json({ error: 'identifierId is required' }, { status: 400 })

  await prisma.rentalRestrictionIdentifier.delete({ where: { id: identifierId } })
    return NextResponse.json({ success: true })
}
