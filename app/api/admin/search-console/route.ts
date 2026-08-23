export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSearchConsoleSummary } from '@/lib/search-console'

/**
 * Admin-only endpoint returning live Google Search Console numbers.
 * Falls back to { connected: false } when Google credentials / GSC_SITE_URL
 * are not configured in the environment.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const summary = await getSearchConsoleSummary(28)
    return NextResponse.json(summary)
  } catch (err) {
    return NextResponse.json({
      connected: false,
      reason: err instanceof Error ? err.message : 'Search Console request failed',
      rangeDays: 0,
      totals: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
      topQueries: [],
    })
  }
}
