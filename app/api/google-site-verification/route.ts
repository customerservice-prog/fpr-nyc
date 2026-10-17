export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { readSavedNycVerificationFile } from '@/lib/nycSearchVerification'

export async function GET(request: NextRequest) {
  const file = request.nextUrl.searchParams.get('file') || ''
  const saved = await readSavedNycVerificationFile()
  if (!saved || file !== saved) {
    return new NextResponse('Not found', {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
  return new NextResponse('google-site-verification: ' + saved, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
