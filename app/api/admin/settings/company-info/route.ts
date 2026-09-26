export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const EDITABLE_FIELDS = [
    'businessName',
    'phone',
    'email',
    'address',
    'city',
    'state',
    'zip',
    'timeZone',
  ] as const

function pickEditable(source: Record<string, unknown>) {
    const result: Record<string, unknown> = {}
        for (const field of EDITABLE_FIELDS) {
              if (field in source) result[field] = source[field]
        }
    return result
}

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = await prisma.companySettings.findFirst()
    return NextResponse.json({ settings: settings ? pickEditable(settings) : null })
}

export async function PUT(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as any)?.role !== 'admin') {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

  const body = await request.json()
    const data = pickEditable(body)
    const existing = await prisma.companySettings.findFirst()

  const settings = existing
      ? await prisma.companySettings.update({ where: { id: existing.id }, data })
        : await prisma.companySettings.create({ data })

  return NextResponse.json({ settings: pickEditable(settings) })
}
