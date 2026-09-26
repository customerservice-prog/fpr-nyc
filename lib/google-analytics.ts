import { getAccessToken, hasGoogleCredentials } from './google-auth'

/**
 * Google Analytics 4 (GA4) Data API integration.
 *
 * Reads live traffic numbers for the property identified by GA_PROPERTY_ID
 * (the numeric GA4 property id, e.g. "431258108"). Requires a service-account
 * credential (see lib/google-auth.ts) that has been granted Viewer access on
 * the GA4 property.
 *
 * Returns { connected: false } whenever credentials or the property id are
 * missing, so the dashboard can fall back to an "open in Google" state instead
 * of showing fabricated numbers.
 */

const GA_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'

export interface GaGeoRow { name: string; sessions: number }
export interface GaSourceRow { name: string; sessions: number }
export interface GaTrendRow { date: string; sessions: number; users: number }

export interface GaSummary {
  connected: boolean
  reason?: string
  rangeDays: number
  totals: {
    sessions: number
    pageViews: number
    activeUsers: number
    newUsers: number
    engagementRate: number
    averageSessionDuration: number
  }
  byCountry: GaGeoRow[]
  byCity: GaGeoRow[]
  bySource: GaSourceRow[]
  trend: GaTrendRow[]
}

function n(v: unknown): number {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

async function runReport(propertyId: string, token: string, body: unknown) {
  const res = await fetch(
    'https://analyticsdata.googleapis.com/v1beta/properties/' +
      encodeURIComponent(propertyId) +
      ':runReport',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    }
  )
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error('GA4 runReport failed: ' + res.status + ' ' + text.slice(0, 200))
  }
  return res.json() as Promise<{
    rows?: Array<{
      dimensionValues?: Array<{ value: string }>
      metricValues?: Array<{ value: string }>
    }>
  }>
}

function notConnected(reason: string): GaSummary {
  return {
    connected: false,
    reason,
    rangeDays: 0,
    totals: {
      sessions: 0,
      pageViews: 0,
      activeUsers: 0,
      newUsers: 0,
      engagementRate: 0,
      averageSessionDuration: 0,
    },
    byCountry: [],
    byCity: [],
    bySource: [],
    trend: [],
  }
}

export async function getGoogleAnalyticsSummary(rangeDays = 28): Promise<GaSummary> {
  const propertyId = process.env.GA_PROPERTY_ID
  if (!propertyId) return notConnected('GA_PROPERTY_ID is not set')
  if (!hasGoogleCredentials()) return notConnected('Google credentials are not configured')

  const token = await getAccessToken(GA_SCOPE)
  if (!token) return notConnected('Could not obtain a Google access token')

  const dateRanges = [{ startDate: rangeDays + 'daysAgo', endDate: 'today' }]

  const [totalsRes, countryRes, cityRes, sourceRes, trendRes] = await Promise.all([
    runReport(propertyId, token, {
      dateRanges,
      metrics: [
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'activeUsers' },
        { name: 'newUsers' },
        { name: 'engagementRate' },
        { name: 'averageSessionDuration' },
      ],
    }),
    runReport(propertyId, token, {
      dateRanges,
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 8,
    }),
    runReport(propertyId, token, {
      dateRanges,
      dimensions: [{ name: 'city' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 8,
    }),
    runReport(propertyId, token, {
      dateRanges,
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 8,
    }),
    runReport(propertyId, token, {
      dateRanges,
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
      limit: 60,
    }),
  ])

  const tv = totalsRes.rows?.[0]?.metricValues ?? []
  const geo = (rows: typeof countryRes.rows): GaGeoRow[] =>
    (rows ?? []).map((r) => ({
      name: r.dimensionValues?.[0]?.value ?? 'Unknown',
      sessions: n(r.metricValues?.[0]?.value),
    }))

  const trend: GaTrendRow[] = (trendRes.rows ?? []).map((r) => {
    const raw = r.dimensionValues?.[0]?.value ?? ''
    const date =
      raw.length === 8 ? raw.slice(0, 4) + '-' + raw.slice(4, 6) + '-' + raw.slice(6, 8) : raw
    return {
      date,
      sessions: n(r.metricValues?.[0]?.value),
      users: n(r.metricValues?.[1]?.value),
    }
  })

  return {
    connected: true,
    rangeDays,
    totals: {
      sessions: n(tv[0]?.value),
      pageViews: n(tv[1]?.value),
      activeUsers: n(tv[2]?.value),
      newUsers: n(tv[3]?.value),
      engagementRate: n(tv[4]?.value),
      averageSessionDuration: n(tv[5]?.value),
    },
    byCountry: geo(countryRes.rows),
    byCity: geo(cityRes.rows),
    bySource: geo(sourceRes.rows),
    trend,
  }
}
