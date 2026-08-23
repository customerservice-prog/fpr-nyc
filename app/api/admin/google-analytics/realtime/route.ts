export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAccessToken, hasGoogleCredentials } from '@/lib/google-auth'

const GA_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'
const GA_PROPERTY_ID = process.env.GA_PROPERTY_ID

function n(v: string | null | undefined): number {
  const parsed = Number(v)
  return Number.isFinite(parsed) ? parsed : 0
}

type GaRow = {
  dimensionValues?: { value?: string }[]
  metricValues?: { value?: string }[]
}

async function gaFetch(
  propertyId: string,
  token: string,
  method: 'runRealtimeReport' | 'runReport',
  body: unknown,
) {
  const res = await fetch(
    'https://analyticsdata.googleapis.com/v1beta/properties/' +
      propertyId +
      ':' +
      method,
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    throw new Error('Google Analytics ' + method + ' failed (' + res.status + ')')
  }
  return (await res.json()) as { rows?: GaRow[] }
}

/**
 * Admin-only endpoint returning live GA4 numbers:
 *  - activeNow: users on the site right now (Realtime API)
 *  - activeByPage: which page each live visitor is on, with counts (Realtime API)
 *  - today: views / visitors / sessions since midnight, inclusive of live activity
 *  - last24h: rolling active users, sessions and page views for the last 24 hours
 *  - topPages: most-viewed pages over the last 24 hours
 *  - generatedAt: ISO timestamp of when this data was produced
 * Falls back to { connected: false } when Google credentials / GA_PROPERTY_ID
 * are not configured in the environment.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const role = (session.user as { role?: string })?.role
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const emptyPayload = {
    connected: false,
    activeNow: 0,
    activeByPage: [],
    today: null,
    last24h: null,
    topPages: [],
    generatedAt: new Date().toISOString(),
  }

  if (!GA_PROPERTY_ID || !hasGoogleCredentials()) {
    return NextResponse.json(emptyPayload)
  }

  const propertyId: string = GA_PROPERTY_ID

  try {
    const token = await getAccessToken(GA_SCOPE)

    if (!token) {
      return NextResponse.json(emptyPayload)
    }

    const realtimeRes = await gaFetch(propertyId, token, 'runRealtimeReport', {
      metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
    })

    const realtimeByPageRes = await gaFetch(propertyId, token, 'runRealtimeReport', {
      dimensions: [{ name: 'unifiedScreenName' }],
      metrics: [{ name: 'activeUsers' }],
      limit: 10,
    })

    const todayRes = await gaFetch(propertyId, token, 'runReport', {
      dateRanges: [{ startDate: 'today', endDate: 'today' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'activeUsers' },
        { name: 'sessions' },
      ],
    })

    const dayRes = await gaFetch(propertyId, token, 'runReport', {
      dateRanges: [{ startDate: '1daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
      ],
    })

    const topPagesRes = await gaFetch(propertyId, token, 'runReport', {
      dateRanges: [{ startDate: '1daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 8,
    })

    const activeNow = n(realtimeRes.rows?.[0]?.metricValues?.[0]?.value)
    const realtimePageViews = n(realtimeRes.rows?.[0]?.metricValues?.[1]?.value)

    const activeByPage = (realtimeByPageRes.rows ?? [])
      .map((r) => ({
        page: r.dimensionValues?.[0]?.value || '(unknown)',
        users: n(r.metricValues?.[0]?.value),
      }))
      .filter((r) => r.users > 0)

    const tv = todayRes.rows?.[0]?.metricValues ?? []
    const dv = dayRes.rows?.[0]?.metricValues ?? []

    const topPages = (topPagesRes.rows ?? []).map((r) => ({
      path: r.dimensionValues?.[0]?.value || '(unknown)',
      title: r.dimensionValues?.[1]?.value || '',
      views: n(r.metricValues?.[0]?.value),
      users: n(r.metricValues?.[1]?.value),
    }))

    return NextResponse.json({
      connected: true,
      activeNow,
      activeByPage,
      today: {
        pageViews: Math.max(n(tv[0]?.value), realtimePageViews),
        visitors: Math.max(n(tv[1]?.value), activeNow),
        sessions: Math.max(n(tv[2]?.value), activeNow),
      },
      last24h: {
        activeUsers: n(dv[0]?.value),
        sessions: n(dv[1]?.value),
        pageViews: n(dv[2]?.value),
      },
      topPages,
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({
      ...emptyPayload,
      generatedAt: new Date().toISOString(),
      reason:
        err instanceof Error
          ? err.message
          : 'Google Analytics realtime request failed',
    })
  }
}
