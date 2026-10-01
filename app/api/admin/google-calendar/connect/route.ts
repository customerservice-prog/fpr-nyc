export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { buildGoogleAuthorizationUrl } from '@/lib/googleCalendar'

const CANONICAL_ORIGIN = 'https://friendlypartyrentalnyc.com'

function publicOrigin(request: NextRequest) {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || '').trim()
  if (configured) {
    try {
      const url = new URL(configured)
      if (!['0.0.0.0', 'localhost', '127.0.0.1'].includes(url.hostname)) return url.origin
    } catch {}
  }

  const forwardedHost = (request.headers.get('x-forwarded-host') || '').split(',')[0].trim()
  const forwardedProto = (request.headers.get('x-forwarded-proto') || '').split(',')[0].trim() || 'https'
  if (
    forwardedHost &&
    !forwardedHost.startsWith('0.0.0.0') &&
    !forwardedHost.startsWith('localhost') &&
    !forwardedHost.startsWith('127.0.0.1')
  ) {
    return `${forwardedProto}://${forwardedHost}`
  }

  return CANONICAL_ORIGIN
}

function callbackUrl(request: NextRequest) {
  return publicOrigin(request) + '/api/admin/google-calendar/callback'
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.redirect(new URL('/admin/login', publicOrigin(request)))
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Only the owner can connect Google Calendar.' }, { status: 403 })
  }

  const username = String((session.user as { username?: string }).username || session.user?.email || 'owner')
  const authorizationUrl = await buildGoogleAuthorizationUrl(callbackUrl(request), username)
  if (!authorizationUrl) {
    const url = new URL('/admin', publicOrigin(request))
    url.searchParams.set('googleCalendar', 'setup-required')
    return NextResponse.redirect(url)
  }
  return NextResponse.redirect(authorizationUrl)
}
