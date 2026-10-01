import { normalizeNycSearchProperty } from './nycSearchReadiness'
import { getAccessToken, hasGoogleCredentials } from './google-auth'
import { getGoogleSearchConsoleAccessToken } from './googleCalendar'

/**
 * Google Search Console (Search Analytics API) integration.
 *
 * Reads search-query performance for the canonical Friendly Party Rental NYC property.
 * Authentication prefers the encrypted business-Google OAuth connection used by
 * Google Calendar, with a service-account credential as a backwards-compatible fallback.
 * Returns { connected: false } whenever the property or Google authorization is missing.
 */

const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'

export interface GscQueryRow {
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface GscTrendRow {
  date: string
  clicks: number
  impressions: number
}

export interface GscSummary {
  connected: boolean
  reason?: string
  rangeDays: number
  totals: {
    clicks: number
    impressions: number
    ctr: number
    position: number
  }
  topQueries: GscQueryRow[]
  trend: GscTrendRow[]
}

function n(v: unknown): number {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

function notConnected(reason: string): GscSummary {
  return {
    connected: false,
    reason,
    rangeDays: 0,
    totals: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
    topQueries: [],
    trend: [],
  }
}

interface GscApiRow {
  keys?: string[]
  clicks?: number
  impressions?: number
  ctr?: number
  position?: number
}

async function searchConsoleToken(): Promise<string | null> {
  try {
    const oauth = await getGoogleSearchConsoleAccessToken()
    if (oauth?.accessToken) return oauth.accessToken
  } catch {
    // Fall through to the service-account path when available.
  }
  if (!hasGoogleCredentials()) return null
  return getAccessToken(GSC_SCOPE)
}

async function query(siteUrl: string, token: string, body: unknown): Promise<{ rows?: GscApiRow[] }> {
  const res = await fetch(
    'https://www.googleapis.com/webmasters/v3/sites/' +
      encodeURIComponent(siteUrl) +
      '/searchAnalytics/query',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    }
  )
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error('Search Console query failed: ' + res.status + ' ' + text.slice(0, 200))
  }
  return res.json() as Promise<{ rows?: GscApiRow[] }>
}

export async function getSearchConsoleSummary(rangeDays = 28): Promise<GscSummary> {
  const configuredSite = process.env.GSC_SITE_URL || process.env.NYC_GSC_PROPERTY
  if (!configuredSite) return notConnected('NYC Search Console reporting is not configured. This does not mean the website is absent from Google.')
  const siteUrl = normalizeNycSearchProperty(configuredSite)
  if (!siteUrl) return notConnected('Only the canonical Friendly Party Rental NYC Search Console property may be used here. Railway, Syracuse, SC and unrelated properties are rejected.')
  const token = await searchConsoleToken()
  if (!token) return notConnected('Reconnect the Friendly Party Rental business Google account in Admin to grant Search Console read-only access. Calendar access can remain connected while permissions are refreshed.')

  const startDate = isoDaysAgo(rangeDays)
  const endDate = isoDaysAgo(1)

  let totalsRes: { rows?: GscApiRow[] }
  let queriesRes: { rows?: GscApiRow[] }
  let trendRes: { rows?: GscApiRow[] }
  try {
    ;[totalsRes, queriesRes, trendRes] = await Promise.all([
      query(siteUrl, token, { startDate, endDate, dimensions: [] }),
      query(siteUrl, token, {
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: 15,
      }),
      query(siteUrl, token, {
        startDate,
        endDate,
        dimensions: ['date'],
      }),
    ])
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (/\b403\b/.test(message)) {
      return notConnected('The connected business Google account does not have access to this NYC Search Console property yet. Verify/add friendlypartyrentalnyc.com in Search Console, then reconnect Google permissions in Admin.')
    }
    throw error
  }

  const t = totalsRes.rows?.[0]
  const topQueries: GscQueryRow[] = (queriesRes.rows ?? []).map((r) => ({
    query: r.keys?.[0] ?? '',
    clicks: n(r.clicks),
    impressions: n(r.impressions),
    ctr: n(r.ctr),
    position: n(r.position),
  }))

  const trend: GscTrendRow[] = (trendRes.rows ?? [])
    .map((r) => ({
      date: r.keys?.[0] ?? '',
      clicks: n(r.clicks),
      impressions: n(r.impressions),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    connected: true,
    rangeDays,
    totals: {
      clicks: n(t?.clicks),
      impressions: n(t?.impressions),
      ctr: n(t?.ctr),
      position: n(t?.position),
    },
    topQueries,
    trend,
  }
}
