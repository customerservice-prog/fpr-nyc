import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-static'

export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/brand/friendly-party-rental-nyc-logo-v7.png', request.url), 307)
}
