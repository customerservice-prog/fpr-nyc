import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type ResendEmailEvent = {
  type?: string
  created_at?: string
  data?: {
    email_id?: string
    to?: string[]
    subject?: string
    bounce?: { message?: string; type?: string; subType?: string }
    failed?: { reason?: string }
  }
}

function verifySvixSignature(payload: string, request: NextRequest) {
  const secret = String(process.env.RESEND_WEBHOOK_SECRET || '').trim()
  if (!secret) return false

  const id = request.headers.get('svix-id')
  const timestamp = request.headers.get('svix-timestamp')
  const signatureHeader = request.headers.get('svix-signature')
  if (!id || !timestamp || !signatureHeader) return false

  const encodedSecret = secret.startsWith('whsec_') ? secret.slice(6) : secret
  let key: Buffer
  try {
    key = Buffer.from(encodedSecret, 'base64')
  } catch {
    return false
  }

  const signed = `${id}.${timestamp}.${payload}`
  const expected = createHmac('sha256', key).update(signed).digest('base64')
  const candidates = signatureHeader
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.startsWith('v1,') ? part.slice(3) : part)

  return candidates.some((candidate) => {
    try {
      const a = Buffer.from(candidate)
      const b = Buffer.from(expected)
      return a.length === b.length && timingSafeEqual(a, b)
    } catch {
      return false
    }
  })
}

function statusForEvent(type: string) {
  switch (type) {
    case 'email.sent': return 'sent'
    case 'email.delivered': return 'delivered'
    case 'email.delivery_delayed': return 'delayed'
    case 'email.bounced': return 'bounced'
    case 'email.complained': return 'complained'
    case 'email.failed': return 'failed'
    case 'email.suppressed': return 'suppressed'
    default: return null
  }
}

function detailForEvent(event: ResendEmailEvent) {
  if (event.type === 'email.bounced') {
    const bounce = event.data?.bounce
    return [bounce?.type, bounce?.subType, bounce?.message].filter(Boolean).join(' · ') || 'Recipient mailbox rejected the email'
  }
  if (event.type === 'email.failed') {
    return event.data?.failed?.reason || 'Email provider reported a delivery failure'
  }
  if (event.type === 'email.complained') return 'Recipient marked this email as spam'
  if (event.type === 'email.suppressed') return 'Recipient is on the provider suppression list'
  if (event.type === 'email.delivery_delayed') return 'Recipient provider temporarily delayed delivery'
  return null
}

export async function POST(request: NextRequest) {
  const raw = await request.text()
  if (!verifySvixSignature(raw, request)) {
    return new NextResponse('Invalid webhook signature', { status: 400 })
  }

  let event: ResendEmailEvent
  try {
    event = JSON.parse(raw)
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 })
  }

  const type = String(event.type || '')
  const status = statusForEvent(type)
  const messageId = String(event.data?.email_id || '').trim()
  if (!status || !messageId) return NextResponse.json({ ok: true, ignored: true })

  const eventAt = event.created_at ? new Date(event.created_at) : new Date()
  const detail = detailForEvent(event)

  const result = await prisma.order.updateMany({
    where: { emailDeliveryMessageId: messageId },
    data: {
      emailDeliveryStatus: status,
      emailDeliveryLastEvent: type,
      emailDeliveryDetail: detail,
      emailDeliveryUpdatedAt: Number.isNaN(eventAt.getTime()) ? new Date() : eventAt,
    },
  })

  return NextResponse.json({ ok: true, matched: result.count })
}
