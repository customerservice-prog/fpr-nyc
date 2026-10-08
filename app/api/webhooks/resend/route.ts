import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type ResendEvent = {
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

function verifySignature(payload: string, request: NextRequest) {
  const secret = String(process.env.RESEND_WEBHOOK_SECRET || '').trim()
  if (!secret) return false
  const id = request.headers.get('svix-id')
  const timestamp = request.headers.get('svix-timestamp')
  const header = request.headers.get('svix-signature')
  if (!id || !timestamp || !header) return false

  const seconds = Number(timestamp)
  if (!Number.isFinite(seconds) || Math.abs(Date.now() - seconds * 1000) > 5 * 60 * 1000) return false

  const encoded = secret.startsWith('whsec_') ? secret.slice(6) : secret
  let key: Buffer
  try { key = Buffer.from(encoded, 'base64') } catch { return false }
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${payload}`).digest('base64')

  return header.split(/\s+/).map(v => v.trim()).filter(Boolean).some(part => {
    const candidate = part.startsWith('v1,') ? part.slice(3) : part
    try {
      const a = Buffer.from(candidate)
      const b = Buffer.from(expected)
      return a.length === b.length && timingSafeEqual(a, b)
    } catch { return false }
  })
}

function statusFor(type: string) {
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

function detailFor(event: ResendEvent) {
  if (event.type === 'email.bounced') {
    const b = event.data?.bounce
    return [b?.type, b?.subType, b?.message].filter(Boolean).join(' · ') || 'Recipient mailbox rejected the email'
  }
  if (event.type === 'email.failed') return event.data?.failed?.reason || 'Email provider reported a delivery failure'
  if (event.type === 'email.complained') return 'Recipient marked this email as spam'
  if (event.type === 'email.suppressed') return 'Recipient is on the provider suppression list'
  if (event.type === 'email.delivery_delayed') return 'Recipient provider temporarily delayed delivery'
  return null
}

export async function POST(request: NextRequest) {
  const raw = await request.text()
  if (!verifySignature(raw, request)) return new NextResponse('Invalid webhook signature', { status: 400 })

  let event: ResendEvent
  try { event = JSON.parse(raw) } catch { return new NextResponse('Invalid JSON', { status: 400 }) }

  const type = String(event.type || '')
  const status = statusFor(type)
  const messageId = String(event.data?.email_id || '').trim()
  if (!status || !messageId) return NextResponse.json({ ok: true, ignored: true })

  const at = event.created_at ? new Date(event.created_at) : new Date()
  const updatedAt = Number.isNaN(at.getTime()) ? new Date() : at
  const result = await prisma.order.updateMany({
    where: { emailDeliveryMessageId: messageId },
    data: {
      emailDeliveryStatus: status,
      emailDeliveryLastEvent: type,
      emailDeliveryDetail: detailFor(event),
      emailDeliveryUpdatedAt: updatedAt,
    },
  })

  return NextResponse.json({ ok: true, matched: result.count })
}
