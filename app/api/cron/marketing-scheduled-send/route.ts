export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { runMarketingScheduler } from '@/lib/marketing/scheduler'

// Default mode prepares reviews. Sending requires a recorded administrator activation.
export async function GET(request: NextRequest) {
  const secret = process.env.MARKETING_CRON_SECRET || process.env.CRON_SECRET
  const received = Buffer.from(request.headers.get('authorization') || '')
  const expected = Buffer.from(`Bearer ${secret || ''}`)
  if (!secret || received.length !== expected.length || !timingSafeEqual(received, expected)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const result = await runMarketingScheduler()
    return NextResponse.json(result, { status: result.errors ? 500 : 200 })
  } catch {
    // Do not replace a heartbeat with invented zero counts after a persistence error.
    console.error('Marketing scheduler failed to record its result')
    return NextResponse.json({ error: 'Marketing check failed. Review sending history for its delivery results.' }, { status: 500 })
  }
}
