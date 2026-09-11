import { getAccessToken, hasGoogleCredentials } from './google-auth'

/**
 * Google Search Console (Search Analytics API) integration.
 *
 * Reads search-query performance for the site identified by GSC_SITE_URL.
 * For a domain property use the form "sc-domain:friendlypartyrental.com";
 * for a URL-prefix property use the full "https://www.friendlypartyrental.com/".
 *
 * Requires a service-account credential (see lib/google-auth.ts) that has been
 * added as a user on the Search Console property. Returns { connected: false }
 * whenever credentials or the site url are missing.
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
    }
  )
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error('Search Console query failed: ' + res.status + ' ' + text.slice(0, 200))
  }
  return res.json() as Promise<{ rows?: GscApiRow[] }>
}

export async function getSearchConsoleSummary(rangeDays = 28): Promise<GscSummary> {
  const siteUrl = process.env.GSC_SITE_URL
  if (!siteUrl) return notConnected('GSC_SITE_URL is not set')
  if (!hasGoogleCredentials()) return notConnected('Google credentials are not configured')

  const token = await getAccessToken(GSC_SCOPE)
  if (!token) return notConnected('Could not obtain a Google access token')

  const startDate = isoDaysAgo(rangeDays)
  const endDate = isoDaysAgo(1)

  const [totalsRes, queriesRes, trendRes] = await Promise.all([
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
