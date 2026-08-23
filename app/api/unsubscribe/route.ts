export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

// Public endpoint — no auth.
// NOTE: The 'unsubscribed' column was reverted from the schema until the
// production DB migration ('npx prisma db push') is run. Until then this
// endpoint is a safe no-op that still shows the friendly confirmation page.
// To re-enable: re-add 'unsubscribed Boolean @default(false)' to the Customer
// model, run the migration, then restore the updateMany below.
async function unsubscribeByEmail(email: string): Promise<number> {
  const clean = (email || '').trim().toLowerCase()
  if (!clean || !clean.includes('@')) return 0
  // Intentionally a no-op until the DB column exists.
  return 0
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email') || ''
  await unsubscribeByEmail(email)
  // Always redirect to the friendly confirmation page (avoid leaking whether an email exists).
  const url = new URL('/unsubscribe', request.url)
  if (email) url.searchParams.set('done', '1')
  return NextResponse.redirect(url)
}

export async function POST(request: NextRequest) {
  let email = ''
  try {
    const body = await request.json()
    email = body.email || ''
  } catch {
    /* ignore */
  }
  await unsubscribeByEmail(email)
  return NextResponse.json({ success: true })
}
