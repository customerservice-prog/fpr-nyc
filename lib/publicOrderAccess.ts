import { createHmac, timingSafeEqual } from 'node:crypto'
import { ASSISTANT_ORDER_COOKIE, verifyAssistantOrderSession } from '@/lib/customerAssistantSecurity'

const TOKEN_VERSION = 1
const MIN_SECRET_LENGTH = 16
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000
const EVENT_GRACE_MS = 30 * 24 * 60 * 60 * 1000

type PublicOrderAccessPayload = {
  v: 1
  orderId: string
  purpose: 'pay'
  exp: number
}

function secret() {
  const value = String(
    process.env.PUBLIC_ORDER_LINK_SECRET ||
    process.env.ASSISTANT_SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    '',
  ).trim()
  return value.length >= MIN_SECRET_LENGTH ? value : null
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

function expiryForEvent(eventDate?: Date | string | null, now = Date.now()) {
  const parsed = eventDate ? new Date(eventDate).getTime() : NaN
  const minimum = now + DEFAULT_TTL_MS
  if (!Number.isFinite(parsed)) return minimum
  return Math.max(minimum, parsed + EVENT_GRACE_MS)
}

export function publicOrderAccessReady() {
  return Boolean(secret())
}

export function createPublicOrderAccessToken(
  orderId: string,
  eventDate?: Date | string | null,
  now = Date.now(),
) {
  const key = secret()
  if (!key || !orderId) return null
  const payload: PublicOrderAccessPayload = {
    v: TOKEN_VERSION,
    orderId,
    purpose: 'pay',
    exp: expiryForEvent(eventDate, now),
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createHmac('sha256', key).update(encoded).digest('base64url')
  return encoded + '.' + signature
}

export function verifyPublicOrderAccessToken(
  token: string | null | undefined,
  expectedOrderId: string,
  now = Date.now(),
) {
  const key = secret()
  if (!key || !token || !expectedOrderId) return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [encoded, signature] = parts
  const expected = createHmac('sha256', key).update(encoded).digest('base64url')
  if (!safeEqual(signature, expected)) return false

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as PublicOrderAccessPayload
    return payload?.v === TOKEN_VERSION &&
      payload?.purpose === 'pay' &&
      payload?.orderId === expectedOrderId &&
      Number.isFinite(payload?.exp) &&
      payload.exp > now
  } catch {
    return false
  }
}

export function customerPayPath(orderId: string, eventDate?: Date | string | null) {
  const token = createPublicOrderAccessToken(orderId, eventDate)
  return token
    ? '/pay/' + encodeURIComponent(orderId) + '?access=' + encodeURIComponent(token)
    : '/pay/' + encodeURIComponent(orderId)
}

export function customerPayUrl(origin: string, orderId: string, eventDate?: Date | string | null) {
  return String(origin || '').replace(/\/$/, '') + customerPayPath(orderId, eventDate)
}

export function hasPublicOrderAccess(
  request: { cookies: { get(name: string): { value: string } | undefined } },
  orderId: string,
  suppliedToken?: string | null,
) {
  if (verifyPublicOrderAccessToken(suppliedToken, orderId)) return true
  const session = verifyAssistantOrderSession(request.cookies.get(ASSISTANT_ORDER_COOKIE)?.value)
  return Boolean(session && session.orderId === orderId)
}
