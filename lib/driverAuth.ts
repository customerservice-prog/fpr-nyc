import crypto from 'crypto'

const SECRET = process.env.NEXTAUTH_SECRET || 'fallback-driver-secret'
const COOKIE_NAME = 'driver_session'
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30 // 30 days

function sign(value: string) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('hex')
}

export function createDriverToken(driverId: string) {
  const payload = JSON.stringify({ driverId, exp: Date.now() + MAX_AGE_MS })
  const encoded = Buffer.from(payload).toString('base64url')
  const sig = sign(encoded)
  return `${encoded}.${sig}`
}

export function verifyDriverToken(token: string | undefined | null): string | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [encoded, sig] = parts
  if (sign(encoded) !== sig) return null
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    if (!payload.driverId || !payload.exp || Date.now() > payload.exp) return null
    return payload.driverId as string
  } catch {
    return null
  }
}

export const DRIVER_COOKIE_NAME = COOKIE_NAME
export const DRIVER_COOKIE_MAX_AGE = Math.floor(MAX_AGE_MS / 1000)
