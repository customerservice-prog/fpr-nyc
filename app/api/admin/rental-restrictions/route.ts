export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createRentalRestriction, normalizeEmail, normalizePhone } from '@/lib/rentalRestrictions'

// GET /api/admin/rental-restrictions?search=&status=
// Lists Rental Restriction "cases" (not raw identifier rows) so staff see
// one understandable card per incident, matching the redesigned Do Not
// Rent page. Search normalizes phone/email the same way matching does, so
// typing digits-only or a differently-formatted email still finds the case.
export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
    const search = (searchParams.get('search') || '').trim()
    const status = searchParams.get('status') || ''

  const where: Record<string, unknown> = {}
      if (status) where.status = status

  if (search) {
        const normalizedEmail = normalizeEmail(search)
        const normalizedPhone = normalizePhone(search)
        const digitsOnly = search.replace(/\D/g, '')
        const or: Record<string, unknown>[] = [
          { reasonCategory: { contains: search, mode: 'insensitive' } },
          { internalNotes: { contains: search, mode: 'insensitive' } },
          { sourceOrderNumber: { contains: search, mode: 'insensitive' } },
          { identifiers: { some: { displayValue: { contains: search, mode: 'insensitive' } } } },
              ]
        if (normalizedEmail) or.push({ identifiers: { some: { type: 'EMAIL', normalizedValue: normalizedEmail } } })
        if (normalizedPhone && digitsOnly.length >= 7) or.push({ identifiers: { some: { type: 'PHONE', normalizedValue: normalizedPhone } } })
        where.OR = or
  }

  const restrictions = await prisma.rentalRestriction.findMany({
        where,
        include: { identifiers: true },
        orderBy: { createdAt: 'desc' },
  })

      // Look up the current name/location for any CUSTOMER_ID identifiers in
        // a single batched query (not per-row) so the list always shows the
        // customer's real, up-to-date name and address instead of whatever
        // text was typed in when the restriction was created.
        const customerIds = Array.from(new Set(
                  restrictions.flatMap((r) => r.identifiers.filter((i) => i.type === 'CUSTOMER_ID' && i.customerIdRef).map((i) => i.customerIdRef as string))
                ))
                const linkedCustomers = customerIds.length
                          ? await prisma.customer.findMany({
                                        where: { id: { in: customerIds } },
                                        select: { id: true, firstName: true, lastName: true, address: true, city: true, state: true, zip: true },
                          })
                          : []
                        const customerById = new Map(linkedCustomers.map((c) => [c.id, c]))
                                const restrictionsWithNames = restrictions.map((r) => ({
                                          ...r,
                                          identifiers: r.identifiers.map((i) => {
                                                      if (i.type !== 'CUSTOMER_ID' || !i.customerIdRef) return i
                                                                  const c = customerById.get(i.customerIdRef)
                                                                              if (!c) return i
                                                                                          const location = [c.address, [c.city, c.state].filter(Boolean).join(', '), c.zip].filter(Boolean).join(' ')
                                                                                                      return { ...i, displayValue: c.firstName + ' ' + c.lastName, customerLocation: location || null }
                                              }),
                                }))
                                    
    const activeCount = restrictions.filter((r) => r.status === 'ACTIVE').length
    const restrictedAddressCount = restrictions.filter(
          (r) => r.status === 'ACTIVE' && r.identifiers.some((i) => i.type === 'ADDRESS')
        ).length
    const recentBlockedAttempts = await prisma.restrictedCheckoutAttempt.count({
          where: { attemptedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    })
    const legacyUnmigratedCount = await prisma.customer.count({
          where: { doNotRent: true, id: { notIn: (await prisma.rentalRestriction.findMany({ where: { sourceCustomerId: { not: null } }, select: { sourceCustomerId: true } })).map((r) => r.sourceCustomerId as string) } },
    })

  return NextResponse.json({
        restrictions: restrictionsWithNames,
        total: restrictions.length,
        activeCount,
        restrictedAddressCount,
        recentBlockedAttempts,
        legacyUnmigratedCount,
  })
}

// POST /api/admin/rental-restrictions
// Creates one restriction "case" with one or more identifiers in a single
// call. Staff choose exactly which identifiers to include (customer,
// email(s), phone(s), address) - nothing is restricted implicitly.
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()

  if (!body.reasonCategory) {
        return NextResponse.json({ error: 'A reason category is required' }, { status: 400 })
  }
      if (!Array.isArray(body.identifiers) || body.identifiers.length === 0) {
            return NextResponse.json({ error: 'Select at least one identifier to restrict (customer, email, phone, or address)' }, { status: 400 })
      }

  try {
        const restriction = await createRentalRestriction({
                reasonCategory: body.reasonCategory,
                internalNotes: body.internalNotes || undefined,
                sourceOrderId: body.sourceOrderId || undefined,
                sourceOrderNumber: body.sourceOrderNumber || undefined,
                sourceCustomerId: body.sourceCustomerId || undefined,
                createdByName: (session.user as { name?: string } | undefined)?.name || undefined,
                expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
                identifiers: body.identifiers,
        })
        return NextResponse.json({ restriction })
  } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create restriction' }, { status: 400 })
  }
}
