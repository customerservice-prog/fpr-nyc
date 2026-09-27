export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { parsePlanningInquiry, savePlanningInquiry, planningInquiryEmail, PlanningInquiryError } from '@/lib/planningInquiry'

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin')
    // Next's internal request URL can differ from the browser's origin behind a
    // reverse proxy. Trust the site's configured origins, not forwarded headers.
    const allowedOrigins = new Set(['https://fpr-nyc-production.up.railway.app', 'https://fpr-nyc-production.up.railway.app'])
    for (const configured of [process.env.PUBLIC_BASE_URL, process.env.NEXTAUTH_URL]) {
      if (!configured) continue
      try {
        const url = new URL(configured)
        if (url.protocol === 'https:' || url.protocol === 'http:') allowedOrigins.add(url.origin)
      } catch { /* Invalid configuration must not widen the origin allowlist. */ }
    }
    if (origin && !allowedOrigins.has(origin)) return NextResponse.json({ error: 'Please submit this form from our website.' }, { status: 403 })
    if (!request.headers.get('content-type')?.includes('application/json')) return NextResponse.json({ error: 'Invalid request format.' }, { status: 415 })
    const raw = await request.text()
    if (raw.length > 16000) return NextResponse.json({ error: 'Your inquiry is too long.' }, { status: 413 })
    const body = JSON.parse(raw)
    if (typeof body?.website === 'string' && body.website.trim()) return NextResponse.json({ error: 'Please call 315-884-1498 to discuss your event.' }, { status: 400 })
    const inquiry = parsePlanningInquiry(body)
    const saved = await savePlanningInquiry(prisma, inquiry)
    if (saved.created) {
      // Persistence, not SMTP, determines whether the inquiry was accepted.
      // A lost email must not turn a saved lead into a duplicate browser retry.
      try {
        const sent = await sendEmail({ to: 'customerservice@friendlypartyrental.com', replyTo: inquiry.email, ...planningInquiryEmail(inquiry) })
        if (!sent.success || sent.simulated) console.warn('Planning inquiry saved; office email delivery was not confirmed.', saved.reference)
      } catch { console.warn('Planning inquiry saved; office email delivery failed.', saved.reference) }
    }
    return NextResponse.json({ success: true, reference: saved.reference })
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Please check your form and try again.' }, { status: 400 })
    if (error instanceof PlanningInquiryError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('Planning inquiry could not be saved.')
    return NextResponse.json({ error: 'Your inquiry could not be saved. Please try again or call 315-884-1498.' }, { status: 500 })
  }
}
