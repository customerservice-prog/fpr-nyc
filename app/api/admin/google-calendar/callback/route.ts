export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  decryptGoogleSecret,
  exchangeGoogleAuthorizationCode,
  getGoogleCalendarConnection,
  saveGoogleCalendarConnection,
  verifyGoogleOAuthState,
} from '@/lib/googleCalendar'

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

function dashboard(request: NextRequest, status: string) {
  const url = new URL('/admin', publicOrigin(request))
  url.searchParams.set('googleCalendar', status)
  url.hash = 'video-meetings'
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.redirect(new URL('/admin/login', publicOrigin(request)))
  }

  const error = request.nextUrl.searchParams.get('error')
  if (error) return dashboard(request, 'denied')

  const code = request.nextUrl.searchParams.get('code') || ''
  const state = request.nextUrl.searchParams.get('state') || ''
  const username = String((session.user as { username?: string }).username || session.user?.email || 'owner')
  if (!code || !state || !verifyGoogleOAuthState(state, username)) {
    return dashboard(request, 'invalid-state')
  }

  try {
    const tokens = await exchangeGoogleAuthorizationCode(code, callbackUrl(request))
    let refreshToken = tokens.refresh_token || ''
    if (!refreshToken) {
      const existing = await getGoogleCalendarConnection()
      if (existing) refreshToken = decryptGoogleSecret(existing.encryptedRefreshToken)
    }
    if (!refreshToken || !tokens.access_token) return dashboard(request, 'missing-refresh-token')

    await saveGoogleCalendarConnection({
      refreshToken,
      accessToken: tokens.access_token,
      scope: tokens.scope || null,
    })
    return dashboard(request, 'connected')
  } catch (error) {
    console.error('Google Calendar OAuth callback failed', error)
    return dashboard(request, 'error')
  }
}
