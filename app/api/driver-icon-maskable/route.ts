import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-static'

export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/images/logo-icon.png', request.url), 307)
}
