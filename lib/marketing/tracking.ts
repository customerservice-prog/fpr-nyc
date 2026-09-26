import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

export type MarketingTrackingKind = 'open' | 'click'
export type MarketingTrackingContext = { campaignSlug: string; runId?: string | null }

type TrackingPayload = {
  v: 1
  kind: MarketingTrackingKind
  email: string
  campaignSlug: string
  runId?: string | null
  url?: string
  issuedAt: number
}

const MAX_TOKEN_AGE_MS = 540 * 24 * 60 * 60 * 1000

function key(): Buffer | null {
  const secret = (process.env.MARKETING_TRACKING_SECRET || process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || '').trim()
  return secret ? createHash('sha256').update(secret).digest() : null
}

function seal(payload: TrackingPayload): string | null {
  const encryptionKey = key()
  if (!encryptionKey) return null
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, encrypted, tag].map((part) => part.toString('base64url')).join('.')
}

export function verifyMarketingTrackingToken(token: string, expectedKind: MarketingTrackingKind): TrackingPayload | null {
  try {
    const encryptionKey = key()
    if (!encryptionKey) return null
    const parts = token.split('.')
    if (parts.length != 3) return null
    const iv = Buffer.from(parts[0], 'base64url')
    const encrypted = Buffer.from(parts[1], 'base64url')
    const tag = Buffer.from(parts[2], 'base64url')
    if (iv.length !== 12 || tag.length !== 16) return null
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey, iv)
    decipher.setAuthTag(tag)
    const decoded = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
    const payload = JSON.parse(decoded) as TrackingPayload
    if (payload.v !== 1 || payload.kind !== expectedKind) return null
    if (!payload.email || !payload.campaignSlug || !Number.isFinite(payload.issuedAt)) return null
    const age = Date.now() - payload.issuedAt
    if (age < -10 * 60 * 1000 || age > MAX_TOKEN_AGE_MS) return null
    return payload
  } catch {
    return null
  }
}

function makeToken(kind: MarketingTrackingKind, email: string, campaignSlug: string, runId?: string | null, url?: string): string | null {
  return seal({
    v: 1,
    kind,
    email: email.trim().toLowerCase(),
    campaignSlug,
    runId: runId || null,
    url,
    issuedAt: Date.now(),
  })
}

export function instrumentMarketingHtml(
  html: string,
  ctx: MarketingTrackingContext & { email: string; origin: string },
): string {
  if (!key()) return html
  const origin = ctx.origin.replace(/\/$/, '')

  const withClicks = html.replace(/href\s*=\s*(["'])(.*?)\1/gi, (full, quote: string, rawHref: string) => {
    const href = String(rawHref || '').trim().replace(/&amp;/g, '&')
    if (!href || href === '#' || /^mailto:|^tel:|^javascript:/i.test(href)) return full
    try {
      const target = new URL(href, origin)
      if (!/^https?:$/.test(target.protocol)) return full
      if (target.origin === origin && (target.pathname === '/api/unsubscribe' || target.pathname.startsWith('/api/marketing/track/'))) return full
      const token = makeToken('click', ctx.email, ctx.campaignSlug, ctx.runId, target.toString())
      if (!token) return full
      return `href=${quote}${origin}/api/marketing/track/click?t=${encodeURIComponent(token)}${quote}`
    } catch {
      return full
    }
  })

  const openToken = makeToken('open', ctx.email, ctx.campaignSlug, ctx.runId)
  if (!openToken) return withClicks
  const pixel = `<img src="${origin}/api/marketing/track/open?t=${encodeURIComponent(openToken)}" width="1" height="1" alt="" aria-hidden="true" style="display:none!important;width:1px;height:1px;border:0;" />`
  return /<\/body>/i.test(withClicks) ? withClicks.replace(/<\/body>/i, `${pixel}</body>`) : withClicks + pixel
}
