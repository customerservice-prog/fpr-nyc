export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const IMPORT_SECRET = 'frp-ers-migration-2026-temp'
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-import-secret',
}

async function isAuthorized(request: NextRequest) {
  const secret = request.headers.get('x-import-secret')
  if (secret && secret === IMPORT_SECRET) return true
  const session = await getServerSession(authOptions)
  return !!session
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

export async function POST(request: NextRequest) {
  const authorized = await isAuthorized(request)
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS })

  const body = await request.json()
  const fixes = body.fixes || []
  let updated = 0
  let notFound = 0
  let ambiguous = 0
  const errors: any[] = []

  for (const f of fixes) {
    try {
      const candidates = await prisma.order.findMany({
        where: {
          totalAmount: f.totalAmount,
          eventDate: new Date(f.eventDate),
          customer: {
            firstName: { equals: f.firstName, mode: 'insensitive' },
            lastName: { equals: f.lastName, mode: 'insensitive' },
          },
        },
      })
      let target = null
      if (candidates.length === 1) {
        target = candidates[0]
      } else if (candidates.length > 1) {
        const broken = candidates.filter((c: any) => !c.orderNumber || c.orderNumber.includes('undefined'))
        if (broken.length === 1) target = broken[0]
      }

      if (target) {
        await prisma.order.update({
          where: { id: target.id },
          data: { orderNumber: 'ERS-' + f.ersOrderId },
        })
        updated++
      } else if (candidates.length === 0) {
        notFound++
        errors.push({ f, reason: 'not found' })
      } else {
        ambiguous++
        errors.push({ f, reason: 'ambiguous', count: candidates.length })
      }
    } catch (e: any) {
      errors.push({ f, error: e.message })
    }
  }

  return NextResponse.json({ updated, notFound, ambiguous, errors }, { headers: CORS_HEADERS })
}
