export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { currentSearchableScUrls, submitScIndexNow } from '@/lib/scIndexNow'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const urls = await currentSearchableScUrls()
    const result = await submitScIndexNow(urls)
    if (!result.ok) {
      return NextResponse.json({ ...result, ok: false }, { status: 502 })
    }
    return NextResponse.json({ ...result, ok: true })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'IndexNow refresh failed',
    }, { status: 500 })
  }
}
