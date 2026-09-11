export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizeEmail } from '@/lib/marketing/eligibility'

// Public endpoint - no auth.
// Persists a real marketing suppression (Customer.unsubscribedFromMarketing)
// keyed by normalized email. Uses updateMany because email is not unique on
// Customer - multiple Customer records can share one inbox, and all of them
// must stop receiving marketing once that inbox unsubscribes.
async function unsubscribeByEmail(email: string): Promise<number> {
    const clean = normalizeEmail(email)
    if (!clean || !clean.includes('@')) return 0
    const result = await prisma.customer.updateMany({
          where: { email: { equals: clean, mode: 'insensitive' } },
          data: { unsubscribedFromMarketing: true, unsubscribedAt: new Date() },
    })
    return result.count
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email') || ''
    await unsubscribeByEmail(email)
    // Always redirect to the friendly confirmation page (avoid leaking whether an email exists).
  const url = new URL('/unsubscribe', request.url)
    if (email) url.searchParams.set('done', '1')
    return NextResponse.redirect(url)
}

export async function POST(request: NextRequest) {
    let email = ''
    try {
          const body = await request.json()
          email = body.email || ''
      } catch {
          /* ignore */
    }
    await unsubscribeByEmail(email)
    return NextResponse.json({ success: true })
}
