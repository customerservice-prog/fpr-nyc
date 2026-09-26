export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getGoogleAnalyticsSummary } from '@/lib/google-analytics'

/**
 * Admin-only endpoint returning live Google Analytics (GA4) traffic numbers.
 * Falls back to { connected: false } when Google credentials / GA_PROPERTY_ID
 * are not configured in the environment.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const summary = await getGoogleAnalyticsSummary(28)
    return NextResponse.json(summary)
  } catch (err) {
    return NextResponse.json({
      connected: false,
      reason: err instanceof Error ? err.message : 'Google Analytics request failed',
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
    })
  }
}
