import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: 'Friendly Party Rental NYC',
      location: 'NYC / Downstate New York',
      revision: 'nyc-full-location-logo-v8',
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  )
}
