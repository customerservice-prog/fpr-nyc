export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createRentalRestriction } from '@/lib/rentalRestrictions'

// POST /api/admin/rental-restrictions/migrate-legacy
// One-time (safe to re-run) migration: converts any legacy
// Customer.doNotRent = true flags into proper RentalRestriction cases with
// CUSTOMER_ID/EMAIL/PHONE identifiers, so no historical flag is lost when
// the old simple boolean is retired. Customers already migrated (i.e. a
// restriction already references them as sourceCustomerId) are skipped, so
// this is idempotent and can be run more than once safely.
export async function POST() {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const alreadyMigrated = await prisma.rentalRestriction.findMany({
        where: { sourceCustomerId: { not: null } },
        select: { sourceCustomerId: true },
  })
    const migratedIds = new Set(alreadyMigrated.map((r) => r.sourceCustomerId))

  const legacyCustomers = await prisma.customer.findMany({
        where: { doNotRent: true, id: { notIn: Array.from(migratedIds) as string[] } },
  })

  const created = []
      for (const customer of legacyCustomers) {
            const identifiers: Parameters<typeof createRentalRestriction>[0]['identifiers'] = [
              { type: 'CUSTOMER_ID', value: `${customer.firstName} ${customer.lastName}`, customerId: customer.id },
                  ]
            if (customer.email) identifiers.push({ type: 'EMAIL', value: customer.email })
            if (customer.phone) identifiers.push({ type: 'PHONE', value: customer.phone })

      const restriction = await createRentalRestriction({
              reasonCategory: 'Other',
              internalNotes: customer.doNotRentNote || 'Migrated automatically from the legacy Do Not Rent flag.',
              sourceCustomerId: customer.id,
              createdByName: 'Legacy migration',
              identifiers,
      })
            created.push(restriction.id)
      }

  return NextResponse.json({ migratedCount: created.length, restrictionIds: created })
}
