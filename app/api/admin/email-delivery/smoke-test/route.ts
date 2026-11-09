import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NYC_EMAIL_ADDRESS, NYC_NOTIFICATION_EMAIL } from '@/lib/nycEmail'
import { sendEmail } from '@/lib/email'
import { confirmNycPageAdminPassword } from '@/lib/confirmNycPageAdminPassword'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// An explicit admin-triggered internal delivery test: never accepts a target
// email address, customer identifier, order ID or message body from the caller.
const NYC_ORIGINS = new Set([
  'https://friendlypartyrentalnyc.com',
  'https://www.friendlypartyrentalnyc.com',
  'https://nyc.friendlypartyrental.com',
  'https://fpr-nyc-production.up.railway.app',
])

function sameNycOrigin(request: NextRequest) {
  const origin = request.headers.get('origin') || ''
  if (NYC_ORIGINS.has(origin) && new URL(origin).hostname === request.nextUrl.hostname) return true
  return process.env.NODE_ENV !== 'production' &&
    /^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(origin) && new URL(origin).host === request.nextUrl.host
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string } | undefined)?.role !== 'admin') {
    return NextResponse.json({ error: 'NYC administrator required' }, { status: 403 })
  }
  if (!sameNycOrigin(request)) return NextResponse.json({ error: 'Invalid NYC origin' }, { status: 403 })
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return NextResponse.json({ error: 'JSON required' }, { status: 415 })
  }
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      (body as Record<string, unknown>).confirm !== true) {
    return NextResponse.json({ error: 'Explicit test confirmation required' }, { status: 400 })
  }
  if (!await confirmNycPageAdminPassword(session, (body as Record<string, unknown>).adminPassword)) {
    return NextResponse.json({ error: 'Current NYC administrator password required' }, { status: 403 })
  }

  // Resend's idempotency key prevents duplicate sends for the same calendar-day
  // test, even if the operator clicks twice or the request is retried.
  // SMTP is deliberately excluded because this guarantee cannot be upheld.
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) {
    return NextResponse.json({
      error: 'Resend sender is not fully configured. This test does not use non-idempotent SMTP.',
    }, { status: 503 })
  }
  const utcDay = new Date().toISOString().slice(0, 10)
  try {
    const response = await sendEmail({
      to: NYC_NOTIFICATION_EMAIL,
      subject: 'Internal NYC transactional delivery smoke test ' + utcDay,
      replyTo: NYC_EMAIL_ADDRESS,
      idempotencyKey: 'nyc-office-email-smoke-' + utcDay,
      text: 'INTERNAL NYC DELIVERY TEST ONLY.\nNo customer, rental order, payment, refund, invoice or reservation was created.\nThis tests the NYC website\'s outbound Resend mail flow to the central office.\nProvider acceptance is NOT proof of Gmail inbox delivery.\nDate (UTC): ' + utcDay,
      html: '<div style="font:16px Arial,sans-serif"><h2>Internal NYC delivery test</h2><p>No customer, rental order, payment or reservation was created.</p><p>This is a controlled test of the NYC website outbound Resend delivery to the central office.</p><p><strong>Provider acceptance does not establish inbox delivery.</strong> Check the NYC email delivery audit.</p><p>Date (UTC): ' + utcDay + '</p></div>',
    })
    return NextResponse.json({
      accepted: response.success,
      delivered: false,
      destination: NYC_NOTIFICATION_EMAIL,
      provider: response.provider,
      providerMessageId: 'providerId' in response ? response.providerId : undefined,
      note: 'Resend accepted the NYC office test. Check webhook events and the central inbox to establish delivery.',
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[nyc-email-smoke] Internal office test failed')
    return NextResponse.json({ error: 'NYC internal email test could not be accepted. Review sender credentials and the email audit.' }, { status: 503 })
  }
}
