export const dynamic = 'force-dynamic'
import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { recordMarketingFeedback } from '@/lib/marketing/feedbackMonitor'
import { normalizeSuppressionEmail } from '@/lib/marketing/suppression'

// Generic adapter endpoint, NOT a built-in Gmail/provider webhook. An external
// provider adapter must validate its provider's signed notification, normalize
// it to {email, type: 'bounce'|'complaint'}, then call this endpoint using
// Authorization: Bearer <MARKETING_FEEDBACK_SECRET> (at least 32 characters).
// Without that adapter/secret, monitor the mailbox and use the admin delivery
// holds screen for delayed bounces/complaints. SMTP acceptance is not delivery.
export async function POST(request: NextRequest) {
  const secret = process.env.MARKETING_FEEDBACK_SECRET || ''
  const options = { headers: { 'Cache-Control': 'no-store' } }
  if (secret.length < 32) return NextResponse.json({ error: 'Feedback adapter is not configured' }, { ...options, status: 503 })
  const provided = Buffer.from(request.headers.get('authorization') || '')
  const expected = Buffer.from(`Bearer ${secret}`)
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return NextResponse.json({ error: 'Unauthorized' }, { ...options, status: 401 })
  let body: any
  try {
    const raw = await request.text()
    if (raw.length > 4096) return NextResponse.json({ error: 'Request is too large' }, { ...options, status: 413 })
    body = JSON.parse(raw)
  } catch { return NextResponse.json({ error: 'Invalid feedback' }, { ...options, status: 400 }) }
  const email = normalizeSuppressionEmail(body?.email)
  if (!email || !['bounce', 'complaint'].includes(body?.type)) return NextResponse.json({ error: 'Invalid feedback' }, { ...options, status: 400 })
  try { await recordMarketingFeedback({ email, type: body.type, runId: typeof body.eventId === 'string' && body.eventId.length <= 128 ? 'adapter:' + body.eventId : 'adapter:' + email + ':' + body.type }) }
  catch { return NextResponse.json({ error: 'Feedback could not be saved' }, { ...options, status: 503 }) }
  return NextResponse.json({ success: true }, options)
}

