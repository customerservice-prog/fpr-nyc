import crypto from 'crypto'

/**
 * Minimal, dependency-free Google service-account OAuth2 helper.
 *
 * Reads a service-account credential from the environment and exchanges a
 * signed JWT for a short-lived OAuth access token. Used by the Google
 * Analytics (GA4 Data API) and Search Console integrations.
 *
 * Configure ONE of the following in the environment (never commit secrets):
 *   - GOOGLE_SERVICE_ACCOUNT_JSON : the full service-account JSON as a string
 *   - GOOGLE_APPLICATION_CREDENTIALS : path to a service-account JSON file
 */

interface ServiceAccount {
  client_email: string
  private_key: string
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

let cachedSa: ServiceAccount | null | undefined

function loadServiceAccount(): ServiceAccount | null {
  if (cachedSa !== undefined) return cachedSa
  try {
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    if (raw && raw.trim().startsWith('{')) {
      const parsed = JSON.parse(raw)
      cachedSa = { client_email: parsed.client_email, private_key: parsed.private_key }
      return cachedSa
    }
    const path = process.env.GOOGLE_APPLICATION_CREDENTIALS
    if (path) {
      // Lazy require so bundling never fails when fs is unavailable at build time.
      const fs = require('fs') as typeof import('fs')
      const parsed = JSON.parse(fs.readFileSync(path, 'utf8'))
      cachedSa = { client_email: parsed.client_email, private_key: parsed.private_key }
      return cachedSa
    }
  } catch {
    // fall through to null
  }
  cachedSa = null
  return cachedSa
}

/** True when a usable service-account credential is present in the environment. */
export function hasGoogleCredentials(): boolean {
  return loadServiceAccount() !== null
}

interface TokenCacheEntry {
  token: string
  expiresAt: number
}
const tokenCache: Record<string, TokenCacheEntry> = {}

/**
 * Returns an OAuth2 access token for the given scope, or null if no
 * service-account credential is configured. Tokens are cached until ~1 min
 * before expiry.
 */
export async function getAccessToken(scope: string): Promise<string | null> {
  const sa = loadServiceAccount()
  if (!sa || !sa.client_email || !sa.private_key) return null

  const cached = tokenCache[scope]
  const now = Math.floor(Date.now() / 1000)
  if (cached && cached.expiresAt - 60 > now) return cached.token

  const header = { alg: 'RS256', typ: 'JWT' }
  const claim = {
    iss: sa.client_email,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const signingInput =
    base64url(JSON.stringify(header)) + '.' + base64url(JSON.stringify(claim))
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(signingInput)
  signer.end()
  const signature = base64url(signer.sign(sa.private_key.replace(/\\n/g, '\n')))
  const assertion = signingInput + '.' + signature

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  if (!res.ok) {
    throw new Error('Google token exchange failed: ' + res.status)
  }
  const json = (await res.json()) as { access_token: string; expires_in: number }
  tokenCache[scope] = {
    token: json.access_token,
    expiresAt: now + (json.expires_in || 3600),
  }
  return json.access_token
}
