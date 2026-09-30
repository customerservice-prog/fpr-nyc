import { createPublicKey, verify as verifySignature, type JsonWebKey } from 'node:crypto'

const GITHUB_OIDC_ISSUER = 'https://token.actions.githubusercontent.com'
const GITHUB_OIDC_AUDIENCE = 'fpr-nyc-cron'
const GITHUB_REPOSITORY = 'customerservice-prog/fpr-nyc'
const GITHUB_REF = 'refs/heads/production-nyc-live'
const JWKS_URL = 'https://token.actions.githubusercontent.com/.well-known/jwks'
const CLOCK_SKEW_SECONDS = 60
const JWKS_CACHE_MS = 60 * 60 * 1000

type GithubOidcClaims = {
  iss?: string
  aud?: string | string[]
  exp?: number
  nbf?: number
  iat?: number
  repository?: string
  ref?: string
  event_name?: string
  workflow_ref?: string
}

type GithubJwk = JsonWebKey & { kid?: string; use?: string; alg?: string }

let jwksCache: { expiresAt: number; keys: GithubJwk[] } | null = null

function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

function parseJsonPart<T>(value: string): T | null {
  try {
    return JSON.parse(decodeBase64Url(value).toString('utf8')) as T
  } catch {
    return null
  }
}

function audienceMatches(aud: string | string[] | undefined): boolean {
  return Array.isArray(aud) ? aud.includes(GITHUB_OIDC_AUDIENCE) : aud === GITHUB_OIDC_AUDIENCE
}

export function validateGithubCronClaims(
  claims: GithubOidcClaims,
  workflowPath: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (claims.iss !== GITHUB_OIDC_ISSUER) return false
  if (!audienceMatches(claims.aud)) return false
  if (claims.repository !== GITHUB_REPOSITORY) return false
  if (claims.ref !== GITHUB_REF) return false
  if (!claims.exp || claims.exp < nowSeconds - CLOCK_SKEW_SECONDS) return false
  if (claims.nbf && claims.nbf > nowSeconds + CLOCK_SKEW_SECONDS) return false
  if (claims.iat && claims.iat > nowSeconds + CLOCK_SKEW_SECONDS) return false
  if (!['schedule', 'workflow_dispatch', 'push'].includes(claims.event_name || '')) return false
  const expectedWorkflowRef = `${GITHUB_REPOSITORY}/${workflowPath}@${GITHUB_REF}`
  return claims.workflow_ref === expectedWorkflowRef
}

async function getGithubJwks(forceRefresh = false): Promise<GithubJwk[]> {
  if (!forceRefresh && jwksCache && jwksCache.expiresAt > Date.now()) return jwksCache.keys
  const response = await fetch(JWKS_URL, { cache: 'no-store' })
  if (!response.ok) throw new Error('GitHub OIDC JWKS unavailable')
  const body = await response.json() as { keys?: GithubJwk[] }
  if (!Array.isArray(body.keys) || body.keys.length === 0) throw new Error('GitHub OIDC JWKS empty')
  jwksCache = { keys: body.keys, expiresAt: Date.now() + JWKS_CACHE_MS }
  return body.keys
}

async function verifyGithubOidcToken(token: string, workflowPath: string): Promise<boolean> {
  const parts = token.split('.')
  if (parts.length !== 3) return false

  const header = parseJsonPart<{ alg?: string; kid?: string; typ?: string }>(parts[0])
  const claims = parseJsonPart<GithubOidcClaims>(parts[1])
  if (!header || !claims || header.alg !== 'RS256' || !header.kid) return false
  if (!validateGithubCronClaims(claims, workflowPath)) return false

  let keys = await getGithubJwks()
  let jwk = keys.find((candidate) => candidate.kid === header.kid)
  if (!jwk) {
    keys = await getGithubJwks(true)
    jwk = keys.find((candidate) => candidate.kid === header.kid)
  }
  if (!jwk) return false

  try {
    const publicKey = createPublicKey({ key: jwk, format: 'jwk' })
    const signature = decodeBase64Url(parts[2])
    return verifySignature('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), publicKey, signature)
  } catch {
    return false
  }
}

export async function isAuthorizedCronRequest(request: Request, workflowPath: string): Promise<boolean> {
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.startsWith('Bearer ')) return false
  const token = authHeader.slice('Bearer '.length).trim()
  if (!token) return false

  const legacySecret = process.env.CRON_SECRET
  if (legacySecret && token === legacySecret) return true

  try {
    return await verifyGithubOidcToken(token, workflowPath)
  } catch (error) {
    console.error('[cron-auth] GitHub OIDC verification failed:', error instanceof Error ? error.message : String(error))
    return false
  }
}
