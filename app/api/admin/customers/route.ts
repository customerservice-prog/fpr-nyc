export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeEmail, normalizePhone, normalizeAddress } from '@/lib/rentalRestrictions'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const search = request.nextUrl.searchParams.get('search')?.trim() || ''
  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.min(
    200,
    Math.max(1, parseInt(request.nextUrl.searchParams.get('pageSize') || '50', 10) || 50)
  )

  const words = search.split(/\s+/).filter(Boolean)
  const where =
    words.length > 0
      ? {
          AND: words.map((word) => ({
            OR: [
              { firstName: { contains: word, mode: 'insensitive' as const } },
              { lastName: { contains: word, mode: 'insensitive' as const } },
              { email: { contains: word, mode: 'insensitive' as const } },
              { phone: { contains: word, mode: 'insensitive' as const } },
              { orders: { some: { orderNumber: { contains: word, mode: 'insensitive' as const } } } },
            ],
          })),
        }
      : undefined

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      // NOTE: explicit select (not `include`) so this query does not read the
      // `unsubscribed` column, which may not yet exist in the production DB.
      // Run `npx prisma db push` to add it, then this can safely go back to include.
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        company: true,
        secondaryPhone: true,
        secondaryEmail: true,
        customerType: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        notes: true,
        creditStatus: true,
        doNotRent: true,
        doNotRentNote: true,
        createdAt: true,
        updatedAt: true,
        orders: {
          select: { id: true, totalAmount: true, amountPaid: true, balanceDue: true, status: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])
    const customerIds = customers.map((c) => c.id)
    const normalizedEmails = Array.from(new Set(customers.map((c) => normalizeEmail(c.email)).filter((v): v is string => !!v)))
    const normalizedPhones = Array.from(new Set(customers.map((c) => normalizePhone(c.phone)).filter((v): v is string => !!v)))
    const addressByCustomerId = new Map<string, { propertyKey: string; unitKey: string } | null>()
    const addressKeys = new Set<string>()
    for (const c of customers) {
          const normalized = normalizeAddress({ street1: c.address, city: c.city, state: c.state, zip: c.zip })
          addressByCustomerId.set(c.id, normalized)
          if (normalized) {
                  addressKeys.add(normalized.propertyKey)
                  addressKeys.add(normalized.unitKey)
          }
    }

    // Single batched restriction lookup for the whole page - avoids one query per row.
    const restrictionOr: Record<string, unknown>[] = []
    if (customerIds.length) restrictionOr.push({ type: 'CUSTOMER_ID', customerIdRef: { in: customerIds } })
    if (normalizedEmails.length) restrictionOr.push({ type: 'EMAIL', normalizedValue: { in: normalizedEmails } })
    if (normalizedPhones.length) restrictionOr.push({ type: 'PHONE', normalizedValue: { in: normalizedPhones } })
    if (addressKeys.size) restrictionOr.push({ type: 'ADDRESS', normalizedValue: { in: Array.from(addressKeys) } })

    const activeIdentifiers = restrictionOr.length
      ? await prisma.rentalRestrictionIdentifier.findMany({
                where: {
                            OR: restrictionOr,
                            restriction: { status: 'ACTIVE', OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
                },
                select: { type: true, normalizedValue: true, customerIdRef: true },
      })
          : []

    const restrictedCustomerIds = new Set(activeIdentifiers.filter((i) => i.type === 'CUSTOMER_ID').map((i) => i.customerIdRef))
    const restrictedEmails = new Set(activeIdentifiers.filter((i) => i.type === 'EMAIL').map((i) => i.normalizedValue))
    const restrictedPhones = new Set(activeIdentifiers.filter((i) => i.type === 'PHONE').map((i) => i.normalizedValue))
    const restrictedAddressKeys = new Set(activeIdentifiers.filter((i) => i.type === 'ADDRESS').map((i) => i.normalizedValue))

  const result = customers.map((c) => {
    const activeOrders = c.orders.filter((o) => o.status !== 'cancelled')
        const emailNorm = normalizeEmail(c.email)
        const phoneNorm = normalizePhone(c.phone)
        const personMatch =
                restrictedCustomerIds.has(c.id) ||
                (emailNorm ? restrictedEmails.has(emailNorm) : false) ||
                (phoneNorm ? restrictedPhones.has(phoneNorm) : false)
        const addressNorm = addressByCustomerId.get(c.id)
        const addressMatch =
                !!addressNorm &&
                (restrictedAddressKeys.has(addressNorm.propertyKey) || restrictedAddressKeys.has(addressNorm.unitKey))
        const restrictionStatus: 'RESTRICTED' | 'ADDRESS_RESTRICTED' | null = personMatch
          ? 'RESTRICTED'
                : addressMatch
            ? 'ADDRESS_RESTRICTED'
                  : null
    return {
      ...c,
      orderCount: activeOrders.length,
      totalSpent: activeOrders.reduce((sum, o) => sum + o.amountPaid, 0),
      balanceDue: activeOrders.reduce((sum, o) => sum + Math.max(o.totalAmount - o.amountPaid, 0), 0),
            restrictionStatus,
      lastOrderDate:
        c.orders.length > 0
          ? c.orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt
          : null,
    }
  })

  return NextResponse.json({ customers: result, total, page, pageSize })
}
