export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface ContactInput {
  firstName?: string
  lastName?: string
  email: string
  phone?: string
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const contacts: ContactInput[] = body.contacts || []

  let created = 0
  let skipped = 0
  const errors: any[] = []

  for (const c of contacts) {
    try {
      if (!c.email) { skipped++; continue }
      const existing = await prisma.customer.findFirst({ where: { email: c.email } })
      if (existing) { skipped++; continue }

      await prisma.customer.create({
        data: {
          firstName: c.firstName || 'Unknown',
          lastName: c.lastName || '',
          email: c.email,
          phone: c.phone || null,
          customerType: 'Lead',
          notes: 'Imported from ERS marketing contact list (lead, no order history).',
        },
      })
      created++
    } catch (e: any) {
      errors.push({ email: c.email, error: e.message })
    }
  }

  return NextResponse.json({ created, skipped, errors })
}
