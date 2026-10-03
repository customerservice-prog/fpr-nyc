export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getGoogleSiteVerificationAccessToken } from '@/lib/googleCalendar'
import { ensureNycSearchConsoleVerification } from '@/lib/nycSearchVerification'

function destination(request: NextRequest, status: string) {
  const url = new URL('/admin/settings/search-visibility', request.url)
  url.searchParams.set('searchConsole', status)
  return NextResponse.redirect(url, 303)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.redirect(new URL('/admin/login', request.url), 303)
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const auth = await getGoogleSiteVerificationAccessToken()
  if (!auth) {
    return NextResponse.redirect(new URL('/api/admin/google-calendar/connect', request.url), 303)
  }

  try {
    await ensureNycSearchConsoleVerification(auth.accessToken)
    return destination(request, 'verified')
  } catch (error) {
    console.error('NYC Search Console verification retry failed', error)
    return destination(request, 'error')
  }
}
