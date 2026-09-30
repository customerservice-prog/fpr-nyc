export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCronRequest } from '@/lib/cronAuth'
import { currentSearchableNycUrls, submitNycIndexNow } from '@/lib/nycIndexNow'

export async function GET(request: NextRequest) {
  if (!(await isAuthorizedCronRequest(request, '.github/workflows/indexnow-refresh-cron.yml'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const urls = await currentSearchableNycUrls()
    const result = await submitNycIndexNow(urls)
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
