import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const version =
    process.env.RAILWAY_GIT_COMMIT_SHA ||
    process.env.DEPLOY_REVISION ||
    process.env.RAILWAY_DEPLOYMENT_ID ||
    'unknown'

  return NextResponse.json(
    { version },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    },
  )
}
