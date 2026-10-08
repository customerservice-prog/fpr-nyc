export const dynamic = 'force-dynamic'

import { randomInt, randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { hasDeliverableCustomerEmail } from '@/lib/orderLifecycleNotifications'
import {
  ASSISTANT_MAX_CODE_ATTEMPTS,
  ASSISTANT_ORDER_COOKIE,
  ASSISTANT_SESSION_TTL_SECONDS,
  ASSISTANT_VERIFICATION_TTL_MS,
  assistantHashesEqual,
  assistantSecurityReady,
  createAssistantOrderSession,
  hashAssistantLookup,
  hashAssistantOtp,
  hashAssistantRequestIp,
  normalizeAssistantOrderNumber,
  verifyAssistantOrderSession,
} from '@/lib/customerAssistantSecurity'
import { CUSTOMER_ASSISTANT_ORDER_SELECT, customerAssistantOrderSummary } from '@/lib/customerAssistantOrder'
import { BUSINESS } from '@/lib/utils'

const REQUEST_WINDOW_MS = 10 * 60 * 1000
const MAX_LOOKUPS_PER_ORDER_WINDOW = 4
const MAX_LOOKUPS_PER_IP_WINDOW = 12

function genericRequestMessage() {
  return 'If that order can be verified online, a 6-digit code was sent to the email already on the reservation. Enter the code here. If nothing arrives, call or text ' + BUSINESS.phone + '.'
}

function genericVerificationError() {
  return NextResponse.json(
    { ok: false, error: 'That code is invalid or expired. Request a new code and try again.' },
    { status: 400 },
  )
}

async function verifiedOrder(request: NextRequest) {
  const session = verifyAssistantOrderSession(request.cookies.get(ASSISTANT_ORDER_COOKIE)?.value)
  if (!session) return null
  const order = await prisma.order.findFirst({
    where: { id: session.orderId, customerId: session.customerId },
    select: CUSTOMER_ASSISTANT_ORDER_SELECT,
  })
  return order ? customerAssistantOrderSummary(order) : null
}

async function requestCode(request: NextRequest, body: any, lookupMode: 'order_number' | 'legacy_id' = 'order_number') {
  if (!assistantSecurityReady()) {
    return NextResponse.json(
      { ok: false, error: 'Secure order access is temporarily unavailable. Please call or text ' + BUSINESS.phone + '.' },
      { status: 503 },
    )
  }

  const normalized = lookupMode === 'legacy_id'
    ? String(body?.orderId || '').trim().slice(0, 96)
    : normalizeAssistantOrderNumber(body?.orderNumber)
  const lookupValid = lookupMode === 'legacy_id'
    ? /^[a-zA-Z0-9_-]{10,96}$/.test(normalized)
    : normalized.length >= 2
  if (!lookupValid) {
    return NextResponse.json({ ok: true, message: genericRequestMessage(), challengeId: randomUUID() })
  }

  const lookupHash = hashAssistantLookup((lookupMode === 'legacy_id' ? 'PAYID:' : 'ORDER:') + normalized)
  const requestIpHash = hashAssistantRequestIp(request.headers)
  if (!lookupHash) {
    return NextResponse.json(
      { ok: false, error: 'Secure order access is temporarily unavailable. Please call or text ' + BUSINESS.phone + '.' },
      { status: 503 },
    )
  }

  const windowStart = new Date(Date.now() - REQUEST_WINDOW_MS)
  const [lookupCount, ipCount] = await Promise.all([
    prisma.assistantOrderVerification.count({ where: { lookupHash, createdAt: { gte: windowStart } } }),
    requestIpHash
      ? prisma.assistantOrderVerification.count({ where: { requestIpHash, createdAt: { gte: windowStart } } })
      : Promise.resolve(0),
  ])
  const rateLimited = lookupCount >= MAX_LOOKUPS_PER_ORDER_WINDOW || ipCount >= MAX_LOOKUPS_PER_IP_WINDOW

  const order = rateLimited
    ? null
    : await prisma.order.findFirst({
        where: lookupMode === 'legacy_id'
          ? { id: normalized }
          : { orderNumber: { equals: normalized, mode: 'insensitive' } },
        select: {
          id: true,
          orderNumber: true,
          customerId: true,
          customer: { select: { email: true } },
        },
      })

  const deliverable = Boolean(order && hasDeliverableCustomerEmail(order.customer.email))
  const challengeId = randomUUID()
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const codeHash = hashAssistantOtp(challengeId, deliverable ? code : randomUUID())
  if (!codeHash) {
    return NextResponse.json(
      { ok: false, error: 'Secure order access is temporarily unavailable. Please call or text ' + BUSINESS.phone + '.' },
      { status: 503 },
    )
  }

  await prisma.assistantOrderVerification.create({
    data: {
      id: challengeId,
      lookupHash,
      orderId: deliverable ? order!.id : null,
      customerId: deliverable ? order!.customerId : null,
      codeHash,
      requestIpHash: requestIpHash || null,
      status: rateLimited ? 'rate_limited' : deliverable ? 'created' : 'not_eligible',
      expiresAt: new Date(Date.now() + ASSISTANT_VERIFICATION_TTL_MS),
    },
  })

  if (deliverable && !rateLimited) {
    const sent = await sendEmail({
      to: order!.customer.email,
      subject: 'Your Friendly Party Rental NYC verification code',
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172536">
        <h2>Friendly Party Rental NYC secure order access</h2>
        <p>Use this one-time code to connect your reservation to the 24/7 assistant:</p>
        <p style="font-size:32px;letter-spacing:8px;font-weight:800;margin:24px 0">${code}</p>
        <p>This code expires in 10 minutes and can only be used once. Do not share it with anyone who should not have access to your reservation.</p>
        <p>If you did not request this code, you can ignore this email. No order changes were made.</p>
      </div>`,
      text: `Friendly Party Rental NYC verification code: ${code}\n\nThis code expires in 10 minutes and can only be used once. If you did not request it, ignore this message.`,
    })
    const realDelivery = Boolean((sent as { success?: boolean; simulated?: boolean })?.success && !(sent as { simulated?: boolean })?.simulated)
    await prisma.assistantOrderVerification.update({
      where: { id: challengeId },
      data: { status: realDelivery ? 'sent' : 'delivery_failed' },
    })
  }

  return NextResponse.json({ ok: true, challengeId, message: genericRequestMessage() })
}

async function verifyCode(request: NextRequest, body: any) {
  if (!assistantSecurityReady()) return genericVerificationError()
  const challengeId = String(body?.challengeId || '').trim()
  const code = String(body?.code || '').trim()
  if (!challengeId || !/^\d{6}$/.test(code)) return genericVerificationError()

  const challenge = await prisma.assistantOrderVerification.findUnique({ where: { id: challengeId } })
  if (
    !challenge ||
    challenge.status !== 'sent' ||
    !challenge.orderId ||
    !challenge.customerId ||
    challenge.consumedAt ||
    challenge.expiresAt.getTime() <= Date.now() ||
    challenge.failedAttempts >= ASSISTANT_MAX_CODE_ATTEMPTS
  ) {
    return genericVerificationError()
  }

  const enteredHash = hashAssistantOtp(challenge.id, code)
  if (!assistantHashesEqual(enteredHash, challenge.codeHash)) {
    await prisma.assistantOrderVerification.updateMany({
      where: { id: challenge.id, consumedAt: null, failedAttempts: { lt: ASSISTANT_MAX_CODE_ATTEMPTS } },
      data: { failedAttempts: { increment: 1 } },
    })
    return genericVerificationError()
  }

  const consumed = await prisma.assistantOrderVerification.updateMany({
    where: {
      id: challenge.id,
      status: 'sent',
      consumedAt: null,
      expiresAt: { gt: new Date() },
      failedAttempts: { lt: ASSISTANT_MAX_CODE_ATTEMPTS },
    },
    data: { consumedAt: new Date(), status: 'verified' },
  })
  if (consumed.count !== 1) return genericVerificationError()

  const order = await prisma.order.findFirst({
    where: { id: challenge.orderId, customerId: challenge.customerId },
    select: CUSTOMER_ASSISTANT_ORDER_SELECT,
  })
  if (!order) return genericVerificationError()

  const token = createAssistantOrderSession(challenge.orderId, challenge.customerId)
  if (!token) return genericVerificationError()

  const response = NextResponse.json({ ok: true, order: customerAssistantOrderSummary(order) })
  response.cookies.set({
    name: ASSISTANT_ORDER_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ASSISTANT_SESSION_TTL_SECONDS,
  })
  return response
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const action = String(body?.action || '').trim().toLowerCase()

  if (action === 'request') return requestCode(request, body, 'order_number')
  if (action === 'request_by_id') return requestCode(request, body, 'legacy_id')
  if (action === 'verify') return verifyCode(request, body)

  if (action === 'current') {
    const order = await verifiedOrder(request)
    if (!order) return NextResponse.json({ ok: false, error: 'No verified order is connected.' }, { status: 401 })
    return NextResponse.json({ ok: true, order })
  }

  if (action === 'clear') {
    const response = NextResponse.json({ ok: true })
    response.cookies.set({
      name: ASSISTANT_ORDER_COOKIE,
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
    return response
  }

  return NextResponse.json({ ok: false, error: 'Unsupported action.' }, { status: 400 })
}
