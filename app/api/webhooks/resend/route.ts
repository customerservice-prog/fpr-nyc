import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type ResendEvent = {
  type?: string
  created_at?: string
  data?: { email_id?: string }
}

const STATUS_BY_EVENT: Record<string, string> = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'delayed',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.failed': 'failed',
  'email.suppressed': 'suppressed',
}

// Must verify the original raw body, all three Svix headers, and 5-minute freshness.
// A separate secret is required for NYC. Syracuse's webhook secret is never used here.
export function verifyNycResendSignature(raw: string, headers: Headers, secret: string, nowMs = Date.now()) {
  const eventId = headers.get('svix-id')
  const timestamp = headers.get('svix-timestamp')
  const signature = headers.get('svix-signature')
  if (!eventId || eventId.length > 255 || !timestamp || !signature || !/^\d{10}$/.test(timestamp)) return false
  const signedAt = Number(timestamp) * 1000
  if (!Number.isFinite(signedAt) || Math.abs(nowMs - signedAt) > 5 * 60 * 1000) return false
  if (!secret.startsWith('whsec_')) return false
  const encoded = secret.slice(6)
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return false
  const key = Buffer.from(encoded, 'base64')
  if (key.length < 16) return false
  const expected = createHmac('sha256', key).update(eventId + '.' + timestamp + '.' + raw).digest()
  return signature.split(/\s+/).filter(Boolean).some((token) => {
    if (!token.startsWith('v1,')) return false
    const candidate = token.slice(3)
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(candidate)) return false
    const received = Buffer.from(candidate, 'base64')
    return received.length === expected.length && timingSafeEqual(expected, received)
  })
}

export async function POST(request: NextRequest) {
  const secret = String(process.env.NYC_RESEND_WEBHOOK_SECRET || '').trim()
  if (!secret) return new NextResponse('NYC email delivery tracking is not configured', { status: 503 })

  const raw = await request.text()
  if (raw.length > 128 * 1024) return new NextResponse('Payload too large', { status: 413 })
  if (!verifyNycResendSignature(raw, request.headers, secret)) {
    return new NextResponse('Invalid webhook signature', { status: 400 })
  }

  let event: ResendEvent
  try { event = JSON.parse(raw) }
  catch { return new NextResponse('Invalid JSON payload', { status: 400 }) }

  const type = String(event?.type || '')
  const status = STATUS_BY_EVENT[type]
  const providerMessageId = String(event?.data?.email_id || '').trim()
  const eventId = request.headers.get('svix-id') || ''
  if (!status || !providerMessageId || providerMessageId.length > 255) {
    return NextResponse.json({ ok: true, ignored: true })
  }
  const at = event.created_at ? new Date(event.created_at) : new Date()
  const eventAt = !Number.isNaN(at.getTime()) ? at : new Date()

  // Resend webhooks are account-wide. NEVER record a Syracuse message merely
  // because it was signed by the shared provider. Only IDs registered by NYC
  // sendEmail() can match. No recipient, subject, or body is retained.
  try {
    const result = await prisma.$transaction(async (tx) => {
      const known = await tx.nycOutboundEmail.findUnique({
        where: { providerMessageId }, select: { id: true },
      })
      if (!known) return { matched: false, duplicate: false }

      const inserted = await tx.nycEmailDeliveryEvent.createMany({
        data: [{ id: eventId, providerMessageId, eventType: type, status, eventAt }],
        skipDuplicates: true,
      })
      if (inserted.count === 0) return { matched: true, duplicate: true }

      await tx.nycOutboundEmail.updateMany({
        where: {
          providerMessageId,
          OR: [{ lastEventAt: null }, { lastEventAt: { lte: eventAt } }],
          // Delayed/replayed sent events must not replace a terminal result.
          ...(status === 'sent'
            ? { status: { in: ['accepted', 'sent'] } }
            : status === 'delayed' ? { status: { in: ['accepted', 'sent', 'delayed'] } } : {}),
        },
        data: { status, lastEvent: type, lastEventAt: eventAt },
      })
      return { matched: true, duplicate: false }
    })
    return NextResponse.json({ ok: true, ...result }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    // Provider retries after a 5xx; do not acknowledge an unrecorded database failure.
    console.error('[nyc-resend] Delivery event persistence failed')
    return new NextResponse('Could not record delivery event', { status: 503 })
  }
}
