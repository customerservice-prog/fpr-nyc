import { createHmac, timingSafeEqual } from 'node:crypto'

export const ASSISTANT_ORDER_COOKIE = 'fpr_assistant_order'
export const ASSISTANT_SESSION_TTL_SECONDS = 30 * 60
export const ASSISTANT_VERIFICATION_TTL_MS = 10 * 60 * 1000
export const ASSISTANT_MAX_CODE_ATTEMPTS = 5

type AssistantOrderSession = {
  v: 1
  orderId: string
  customerId: string
  exp: number
}

function secret() {
  const value = String(process.env.ASSISTANT_SESSION_SECRET || process.env.NEXTAUTH_SECRET || '').trim()
  return value.length >= 16 ? value : null
}

export function assistantSecurityReady() {
  return Boolean(secret())
}

function hmac(value: string) {
  const key = secret()
  if (!key) return null
  return createHmac('sha256', key).update(value).digest('base64url')
}

export function normalizeAssistantOrderNumber(value: unknown) {
  return String(value || '')
    .trim()
    .replace(/^#/, '')
    .replace(/\s+/g, '')
    .toUpperCase()
    .slice(0, 64)
}

export function hashAssistantLookup(orderNumber: string) {
  return hmac('lookup:' + normalizeAssistantOrderNumber(orderNumber))
}

export function hashAssistantOtp(challengeId: string, code: string) {
  return hmac('otp:' + challengeId + ':' + code)
}

export function hashAssistantRequestIp(headers: Headers) {
  const forwarded = String(headers.get('x-forwarded-for') || '').split(',')[0]?.trim()
  const ip = forwarded || String(headers.get('x-real-ip') || '').trim() || 'unknown'
  return hmac('ip:' + ip)
}

export function assistantHashesEqual(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return false
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function createAssistantOrderSession(orderId: string, customerId: string, now = Date.now()) {
  const key = secret()
  if (!key || !orderId || !customerId) return null
  const payload: AssistantOrderSession = {
    v: 1,
    orderId,
    customerId,
    exp: now + ASSISTANT_SESSION_TTL_SECONDS * 1000,
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createHmac('sha256', key).update(encoded).digest('base64url')
  return encoded + '.' + signature
}

export function verifyAssistantOrderSession(token: string | null | undefined, now = Date.now()): AssistantOrderSession | null {
  const key = secret()
  if (!key || !token) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [encoded, signature] = parts
  const expected = createHmac('sha256', key).update(encoded).digest('base64url')
  if (!assistantHashesEqual(signature, expected)) return null

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as AssistantOrderSession
    if (payload?.v !== 1 || !payload.orderId || !payload.customerId || !Number.isFinite(payload.exp) || payload.exp <= now) return null
    return payload
  } catch {
    return null
  }
}
