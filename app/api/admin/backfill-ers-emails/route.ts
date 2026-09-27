import { NextResponse } from 'next/server'

function disabled() {
  return NextResponse.json(
    {
      error: 'Legacy New York ERS maintenance is disabled in the New York app.',
      location: 'Riverdale, NY',
    },
    { status: 410 }
  )
}

export const GET = disabled
export const POST = disabled
export const PUT = disabled
export const PATCH = disabled
export const DELETE = disabled
