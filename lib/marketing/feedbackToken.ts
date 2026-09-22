import { createHmac, timingSafeEqual } from 'node:crypto'
import { normalizeSuppressionEmail } from './suppression'

export const FEEDBACK_HEADER = 'X-FPR-Marketing-Feedback'

function signature(payload: string, secret: string) {
  return createHmac('sha256', secret).update('friendly-marketing-feedback-v1\n' + payload).digest('base64url')
}

export function feedbackHeaders(email: string, runId: string, secret = process.env.NEXTAUTH_SECRET || '') {
  if (!secret || !normalizeSuppressionEmail(email) || !runId) throw new Error('Marketing feedback identity is not configured')
  const payload = Buffer.from(JSON.stringify({ email: normalizeSuppressionEmail(email), runId })).toString('base64url')
  return { [FEEDBACK_HEADER]: `${payload}.${signature(payload, secret)}` }
}

export function verifyFeedbackToken(token: string, secret = process.env.NEXTAUTH_SECRET || ''): { email: string; runId: string } | null {
  if (!secret || token.length > 2048) return null
  const [payload, received, extra] = token.trim().split('.')
  if (!payload || !received || extra) return null
  const expected = Buffer.from(signature(payload, secret)), provided = Buffer.from(received)
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString())
    const email = normalizeSuppressionEmail(value.email)
    return email && typeof value.runId === 'string' && value.runId.length <= 128 ? { email, runId: value.runId } : null
  } catch { return null }
}
