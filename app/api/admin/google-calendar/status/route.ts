export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { expectedGoogleCalendarEmail, getGoogleCalendarAccessToken, getGoogleCalendarConnection, getGoogleCredentials, googleConnectionHasSearchConsoleScope } from '@/lib/googleCalendar'

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
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as { role?: string }).role
  const credentials = await getGoogleCredentials()
  const connection = await getGoogleCalendarConnection()
  let healthy = false
  let connectionError: string | null = null

  if (connection) {
    try {
      healthy = !!(await getGoogleCalendarAccessToken())
    } catch (error) {
      connectionError = error instanceof Error ? error.message : 'Google Calendar authorization needs to be renewed.'
    }
  }

  return NextResponse.json({
    configured: !!credentials,
    configurationSource: credentials?.source || null,
    connected: !!connection && healthy,
    connectionExists: !!connection,
    searchConsoleAuthorized: googleConnectionHasSearchConsoleScope(connection),
    connectionError,
    googleEmail: connection?.googleEmail || null,
    calendarId: connection?.calendarId || 'primary',
    callbackUrl: callbackUrl(request),
    canManageConnection: role === 'admin',
    expectedEmail: expectedGoogleCalendarEmail(),
  })
}
