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
  const matches = await prisma.customer.findMany({
    where: { email: { contains: clean, mode: 'insensitive' } }, select: { id: true, email: true },
  })
  const ids = matches.filter(customer => normalizeEmail(customer.email) === clean).map(customer => customer.id)
  if (!ids.length) return 0
  const result = await prisma.customer.updateMany({
    where: { id: { in: ids } },
    data: { unsubscribedFromMarketing: true, unsubscribedAt: new Date() },
  })
  return result.count
}

// Reads the email from either the JSON body or the URL query string.
// RFC 8058 one-click unsubscribe has mail clients (Gmail, Yahoo, etc.) send
// an automatic POST with a body of exactly `List-Unsubscribe=One-Click` -
// not our JSON shape - directly to the List-Unsubscribe URL, which already
// has the recipient's email in its query string (see unsubscribeHeaders() in
// app/api/admin/marketing-send/route.ts). Without this fallback, one-click
// unsubscribe would silently do nothing.
async function readEmailFromRequest(request: NextRequest): Promise<string> {
  const { searchParams } = new URL(request.url)
  const fromQuery = searchParams.get('email') || ''
  if (fromQuery) return fromQuery
  try {
    const body = await request.json()
    return body.email || ''
  } catch {
    return ''
  }
}

// CRITICAL: never build the redirect target from request.url alone. Verified
// live that behind Railway's proxy, request.url resolves to the container's
// internal bind address ("https://0.0.0.0:8080"), not the public hostname -
// which broke the post-unsubscribe confirmation redirect (same root cause
// documented in app/api/admin/marketing-send/route.ts). PUBLIC_BASE_URL is
// the verified, real production URL and must be the source of truth here.
function publicOrigin(request: NextRequest): string {
  const configured = (process.env.PUBLIC_BASE_URL || '').trim().replace(/\/$/, '')
  if (configured) return configured
  return new URL(request.url).origin
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email') || ''
  await unsubscribeByEmail(email)
  // Always redirect to the friendly confirmation page (avoid leaking whether an email exists).
  const url = new URL('/unsubscribe', publicOrigin(request))
  if (email) url.searchParams.set('done', '1')
  return NextResponse.redirect(url)
}

export async function POST(request: NextRequest) {
  const email = await readEmailFromRequest(request)
  await unsubscribeByEmail(email)
  return NextResponse.json({ success: true })
}
