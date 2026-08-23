export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSnapshot } from '@/lib/realtime'

// Admin-only realtime snapshot for the analytics dashboard. Returns the current
// in-memory view of who is on the site right now (last 5 minutes), per-minute
// activity for the last 30 minutes, plus today's rolling visitor/pageview
// totals. Polled by the dashboard every few seconds.

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(getSnapshot())
}
