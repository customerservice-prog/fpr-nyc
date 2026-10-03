import { prisma } from '@/lib/prisma'

export const NYC_SEARCH_URL_PREFIX = 'https://friendlypartyrentalnyc.com/'
const GOOGLE_SITE_TOKEN_URL = 'https://www.googleapis.com/siteVerification/v1/token'
const GOOGLE_SITE_RESOURCE_URL = 'https://www.googleapis.com/siteVerification/v1/webResource'
const FILE_TOKEN = /^google[A-Za-z0-9_-]+\.html$/

export function isGoogleSiteVerificationFile(value: unknown): value is string {
  return typeof value === 'string' && FILE_TOKEN.test(value)
}

async function providerError(response: Response, fallback: string) {
  const body = await response.text().catch(() => '')
  return new Error(fallback + ': ' + response.status + (body ? ' ' + body.slice(0, 240) : ''))
}

export async function requestNycVerificationFile(accessToken: string) {
  const response = await fetch(GOOGLE_SITE_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      verificationMethod: 'FILE',
      site: { type: 'SITE', identifier: NYC_SEARCH_URL_PREFIX },
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw await providerError(response, 'Could not request a Google site-verification token')
  const data = await response.json() as { method?: string; token?: string }
  if (data.method !== 'FILE' || !isGoogleSiteVerificationFile(data.token)) {
    throw new Error('Google returned an invalid site-verification file token.')
  }
  await prisma.googleCalendarConnection.update({
    where: { id: 'primary' },
    data: { searchConsoleVerificationFile: data.token },
  })
  return data.token
}

export async function readSavedNycVerificationFile() {
  const connection = await prisma.googleCalendarConnection.findUnique({
    where: { id: 'primary' },
    select: { searchConsoleVerificationFile: true },
  })
  return isGoogleSiteVerificationFile(connection?.searchConsoleVerificationFile)
    ? connection!.searchConsoleVerificationFile!
    : null
}

async function verifyPublicFile(file: string) {
  const expected = 'google-site-verification: ' + file
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(NYC_SEARCH_URL_PREFIX + file, {
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    }).catch(() => null)
    const body = response ? await response.text().catch(() => '') : ''
    if (response?.ok && body.trim() === expected) return
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)))
  }
  throw new Error('The Google verification file is not publicly reachable on the NYC primary domain.')
}

async function insertVerification(accessToken: string) {
  let lastError: Error | null = null
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(GOOGLE_SITE_RESOURCE_URL + '?verificationMethod=FILE', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        site: { type: 'SITE', identifier: NYC_SEARCH_URL_PREFIX },
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    })
    if (response.ok) return await response.json().catch(() => ({}))
    lastError = await providerError(response, 'Google could not verify the NYC website')
    if (response.status !== 400) break
    await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)))
  }
  throw lastError || new Error('Google could not verify the NYC website.')
}

export async function ensureNycSearchConsoleVerification(accessToken: string) {
  const file = await requestNycVerificationFile(accessToken)
  await verifyPublicFile(file)
  const resource = await insertVerification(accessToken)
  await prisma.googleCalendarConnection.update({
    where: { id: 'primary' },
    data: { searchConsoleVerifiedAt: new Date() },
  })
  return { file, resource }
}
