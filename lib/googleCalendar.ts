import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'
import { cleanMeetingDuration, cleanMeetingEmail, instantToEasternWall, requireFutureMeeting, wallClockToInstant } from '@/lib/meetingTime'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events'
export const SEARCH_CONSOLE_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'
const PROFILE_SCOPES = ['openid', 'email']
const TIME_ZONE = 'America/New_York'
const CONNECTION_ID = 'primary'
const BUSINESS_GOOGLE_EMAIL = 'customerservice@friendlypartyrental.com'

type GoogleCredentials = {
  clientId: string
  clientSecret: string
  source: 'environment' | 'admin_settings'
}

type TokenResponse = {
  access_token?: string
  expires_in?: number
  refresh_token?: string
  scope?: string
  token_type?: string
  error?: string
  error_description?: string
}

export type GoogleCalendarEvent = {
  id: string
  summary: string
  description: string | null
  start: string | null
  end: string | null
  meetLink: string | null
  htmlLink: string | null
  attendeeEmails: string[]
  etag: string
  editable: boolean
  allDay: boolean
  recurring: boolean
  status: string
  scheduledAtWall: string | null
}

export type GoogleMeetingResult = {
  eventId: string
  meetLink: string | null
  htmlLink: string | null
  etag: string
}

function encryptionKey() {
  const secret = (process.env.GOOGLE_CALENDAR_ENCRYPTION_SECRET || process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || '').trim()
  if (!secret) throw new Error('Google Calendar encryption secret is not configured.')
  return createHash('sha256').update(secret).digest()
}

export function encryptGoogleSecret(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, encrypted, tag].map((part) => part.toString('base64url')).join('.')
}

export function decryptGoogleSecret(value: string) {
  const [ivPart, dataPart, tagPart] = value.split('.')
  if (!ivPart || !dataPart || !tagPart) throw new Error('Stored Google Calendar credential is invalid.')
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivPart, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

function stateSecret() {
  const secret = (process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || '').trim()
  if (!secret) throw new Error('NEXTAUTH_SECRET is required for Google Calendar OAuth.')
  return secret
}

export function createGoogleOAuthState(username: string) {
  const payload = Buffer.from(JSON.stringify({
    username,
    exp: Date.now() + 10 * 60 * 1000,
    nonce: randomBytes(16).toString('hex'),
  })).toString('base64url')
  const sig = createHmac('sha256', stateSecret()).update(payload).digest('base64url')
  return payload + '.' + sig
}

export function verifyGoogleOAuthState(state: string, username: string) {
  try {
    const [payload, signature] = state.split('.')
    if (!payload || !signature) return false
    const expected = createHmac('sha256', stateSecret()).update(payload).digest()
    const supplied = Buffer.from(signature, 'base64url')
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return false
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { username?: string; exp?: number }
    return parsed.username === username && Number(parsed.exp || 0) > Date.now()
  } catch {
    return false
  }
}

export async function getGoogleCredentials(): Promise<GoogleCredentials | null> {
  const envClientId = (process.env.GOOGLE_CALENDAR_CLIENT_ID || '').trim()
  const envClientSecret = (process.env.GOOGLE_CALENDAR_CLIENT_SECRET || '').trim()
  if (envClientId && envClientSecret) {
    return { clientId: envClientId, clientSecret: envClientSecret, source: 'environment' }
  }

  const integration = await prisma.integrationConnection.findUnique({ where: { provider: 'google' } })
  const clientId = (integration?.apiKey || '').trim()
  const clientSecret = (integration?.apiSecret || '').trim()
  if (clientId && clientSecret) {
    return { clientId, clientSecret, source: 'admin_settings' }
  }
  return null
}

export async function buildGoogleAuthorizationUrl(redirectUri: string, username: string) {
  const credentials = await getGoogleCredentials()
  if (!credentials) return null
  const url = new URL(GOOGLE_AUTH_URL)
  url.searchParams.set('client_id', credentials.clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent select_account')
  url.searchParams.set('include_granted_scopes', 'true')
  url.searchParams.set('scope', [...PROFILE_SCOPES, CALENDAR_SCOPE, SEARCH_CONSOLE_SCOPE].join(' '))
  url.searchParams.set('state', createGoogleOAuthState(username))
  url.searchParams.set('login_hint', BUSINESS_GOOGLE_EMAIL)
  url.searchParams.set('hd', 'friendlypartyrental.com')
  return url.toString()
}

export async function exchangeGoogleAuthorizationCode(code: string, redirectUri: string) {
  const credentials = await getGoogleCredentials()
  if (!credentials) throw new Error('Google Calendar OAuth is not configured.')
  const body = new URLSearchParams({
    code,
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  })
  const data = await response.json() as TokenResponse
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Google authorization failed.')
  }
  return data
}

async function refreshGoogleAccessToken(refreshToken: string) {
  const credentials = await getGoogleCredentials()
  if (!credentials) throw new Error('Google Calendar OAuth is not configured.')
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
  })
  const data = await response.json() as TokenResponse
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Google Calendar authorization expired.')
  }
  return data.access_token
}

export async function getGoogleProfile(accessToken: string) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: 'Bearer ' + accessToken },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('Could not read the connected Google account.')
  return await response.json() as { email?: string; name?: string }
}

export async function saveGoogleCalendarConnection(args: {
  refreshToken: string
  accessToken: string
  scope?: string | null
}) {
  const profile = await getGoogleProfile(args.accessToken)
  const connectedEmail = String(profile.email || '').trim().toLowerCase()
  if (connectedEmail !== BUSINESS_GOOGLE_EMAIL) {
    throw new Error('Connect the Friendly Party Rental business Google account: ' + BUSINESS_GOOGLE_EMAIL)
  }
  return prisma.googleCalendarConnection.upsert({
    where: { id: CONNECTION_ID },
    update: {
      googleEmail: profile.email || null,
      calendarId: 'primary',
      encryptedRefreshToken: encryptGoogleSecret(args.refreshToken),
      scope: args.scope || CALENDAR_SCOPE,
      connectedAt: new Date(),
    },
    create: {
      id: CONNECTION_ID,
      googleEmail: profile.email || null,
      calendarId: 'primary',
      encryptedRefreshToken: encryptGoogleSecret(args.refreshToken),
      scope: args.scope || CALENDAR_SCOPE,
    },
  })
}

export async function getGoogleCalendarConnection() {
  return prisma.googleCalendarConnection.findUnique({ where: { id: CONNECTION_ID } })
}

export async function getGoogleCalendarAccessToken() {
  const connection = await getGoogleCalendarConnection()
  if (!connection) return null
  const refreshToken = decryptGoogleSecret(connection.encryptedRefreshToken)
  const accessToken = await refreshGoogleAccessToken(refreshToken)
  return { accessToken, connection }
}

export function googleConnectionHasSearchConsoleScope(connection: { scope?: string | null } | null | undefined) {
  const scopes = new Set(String(connection?.scope || '').split(/\s+/).filter(Boolean))
  return scopes.has(SEARCH_CONSOLE_SCOPE)
}

export async function getGoogleSearchConsoleAccessToken() {
  const connection = await getGoogleCalendarConnection()
  if (!connection || !googleConnectionHasSearchConsoleScope(connection)) return null
  const refreshToken = decryptGoogleSecret(connection.encryptedRefreshToken)
  const accessToken = await refreshGoogleAccessToken(refreshToken)
  return { accessToken, connection }
}

export async function disconnectGoogleCalendar() {
  const connection = await getGoogleCalendarConnection()
  if (!connection) return
  try {
    const refreshToken = decryptGoogleSecret(connection.encryptedRefreshToken)
    await fetch(GOOGLE_REVOKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: refreshToken }),
      cache: 'no-store',
    })
  } catch (error) {
    console.warn('Google token revoke failed; deleting local connection anyway.', error)
  }
  await prisma.googleCalendarConnection.delete({ where: { id: CONNECTION_ID } }).catch(() => {})
}

export class GoogleCalendarError extends Error {
  constructor(message: string, public status = 502) { super(message) }
}

type ProviderEvent = {
  id: string
  etag?: string
  summary?: string
  description?: string
  status?: string
  htmlLink?: string
  hangoutLink?: string
  start?: { dateTime?: string; date?: string; timeZone?: string }
  end?: { dateTime?: string; date?: string; timeZone?: string }
  organizer?: { email?: string; self?: boolean }
  attendees?: Array<{ email?: string; organizer?: boolean; self?: boolean; [key: string]: unknown }>
  conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> }
  recurringEventId?: string
  recurrence?: string[]
  eventType?: string
}

type GoogleAuth = NonNullable<Awaited<ReturnType<typeof getGoogleCalendarAccessToken>>>

function eventUrl(auth: GoogleAuth, id?: string) {
  const root = `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(auth.connection.calendarId || 'primary')}/events`
  return new URL(id ? `${root}/${encodeURIComponent(id)}` : root)
}

async function requireGoogleAuth(): Promise<GoogleAuth> {
  const auth = await getGoogleCalendarAccessToken()
  if (!auth) throw new GoogleCalendarError('Connect Google Calendar before managing this meeting.', 409)
  return auth
}

function candidateAttendees(event: ProviderEvent, accountEmail?: string | null) {
  return (event.attendees || []).filter((attendee) => attendee.email && !attendee.self && !attendee.organizer &&
    attendee.email.toLowerCase() !== accountEmail?.toLowerCase() &&
    attendee.email.toLowerCase() !== event.organizer?.email?.toLowerCase())
}

function calendarEvent(event: ProviderEvent, accountEmail?: string | null): GoogleCalendarEvent {
  const recurring = !!event.recurringEventId || !!event.recurrence?.length
  const allDay = !event.start?.dateTime
  return {
    id: String(event.id),
    summary: event.summary || '(Untitled event)',
    description: event.description || null,
    start: event.start?.dateTime || event.start?.date || null,
    end: event.end?.dateTime || event.end?.date || null,
    scheduledAtWall: event.start?.dateTime ? instantToEasternWall(event.start.dateTime) : null,
    meetLink: event.hangoutLink || event.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === 'video')?.uri || null,
    htmlLink: event.htmlLink || null,
    attendeeEmails: candidateAttendees(event, accountEmail).map((attendee) => attendee.email!),
    etag: event.etag || '',
    allDay,
    recurring,
    status: event.status || 'confirmed',
    editable: (event.organizer?.self === true || !!accountEmail && event.organizer?.email?.toLowerCase() === accountEmail.toLowerCase()) &&
      !allDay && !recurring && event.status !== 'cancelled' && (!event.eventType || event.eventType === 'default'),
  }
}

async function providerJson(response: Response, fallback: string): Promise<ProviderEvent> {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 412) throw new GoogleCalendarError('This meeting changed in Google Calendar. Refresh it and try again.', 409)
    if (response.status === 404 || response.status === 410) throw new GoogleCalendarError('This meeting no longer exists in Google Calendar.', 404)
    throw new GoogleCalendarError(data?.error?.message || fallback)
  }
  return data as ProviderEvent
}

async function readProviderEvent(auth: GoogleAuth, id: string) {
  const response = await fetch(eventUrl(auth, id), {
    headers: { Authorization: 'Bearer ' + auth.accessToken }, cache: 'no-store',
  })
  return providerJson(response, 'Could not load the Google Calendar meeting.')
}

export async function getGoogleCalendarEvent(id: string): Promise<GoogleCalendarEvent> {
  const auth = await requireGoogleAuth()
  return calendarEvent(await readProviderEvent(auth, id), auth.connection.googleEmail)
}

export async function createGoogleCalendarMeeting(args: {
  customerName: string
  email?: string | null
  scheduledAt: Date
  durationMinutes?: number
  // Kept for callers that store private notes. Notes never leave our database.
  notes?: string | null
  sendInvite?: boolean
}): Promise<GoogleMeetingResult | null> {
  const auth = await getGoogleCalendarAccessToken()
  if (!auth) return null
  const durationMinutes = cleanMeetingDuration(args.durationMinutes)
  const start = wallClockToInstant(args.scheduledAt)
  const email = cleanMeetingEmail(args.email)
  if (args.sendInvite && !email) throw new GoogleCalendarError('A candidate email is required to send an invitation.', 400)
  const event = {
    summary: `Video interview with ${args.customerName} — Friendly Party Rental NYC`,
    description: 'Friendly Party Rental NYC video interview.',
    visibility: 'private',
    start: { dateTime: start.toISOString(), timeZone: TIME_ZONE },
    end: { dateTime: new Date(start.getTime() + durationMinutes * 60000).toISOString(), timeZone: TIME_ZONE },
    attendees: args.sendInvite && email ? [{ email }] : [],
    conferenceData: { createRequest: { requestId: randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } } },
  }
  const url = eventUrl(auth)
  url.searchParams.set('conferenceDataVersion', '1')
  url.searchParams.set('sendUpdates', args.sendInvite && email ? 'all' : 'none')
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + auth.accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify(event), cache: 'no-store',
  })
  let data = await providerJson(response, 'Could not create the Google Calendar event.')
  if (!data.id) throw new GoogleCalendarError('Google Calendar did not return a meeting ID.')
  let result = calendarEvent(data, auth.connection.googleEmail)
  for (let attempt = 0; attempt < 4 && !result.meetLink; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    // Conference generation can be pending; the already-created event remains
    // the source of truth even if a follow-up refresh temporarily fails.
    try {
      data = await readProviderEvent(auth, data.id)
      result = calendarEvent(data, auth.connection.googleEmail)
    } catch { break }
  }
  return { eventId: result.id, meetLink: result.meetLink, htmlLink: result.htmlLink, etag: result.etag }
}

export type GoogleMeetingAction = {
  action: 'reschedule' | 'cancel' | 'invite'
  etag?: string
  scheduledAt?: string
  durationMinutes?: number
  email?: string | null
  notifyAttendees?: boolean
}

export async function manageGoogleCalendarEvent(id: string, args: GoogleMeetingAction): Promise<{ event?: GoogleCalendarEvent; cancelled?: boolean }> {
  const auth = await requireGoogleAuth()
  let current: ProviderEvent
  try {
    current = await readProviderEvent(auth, id)
  } catch (error) {
    if (args.action === 'cancel' && error instanceof GoogleCalendarError && error.status === 404) return { cancelled: true }
    throw error
  }
  if (args.action === 'cancel' && current.status === 'cancelled') return { cancelled: true }
  const view = calendarEvent(current, auth.connection.googleEmail)
  if (!view.editable) throw new GoogleCalendarError('Only single, timed meetings organized by the connected account can be changed here.', 403)
  if (!args.etag || args.etag !== current.etag) throw new GoogleCalendarError('This meeting changed or needs refreshing. Refresh it before saving.', 409)
  const url = eventUrl(auth, id)
  const headers = { Authorization: 'Bearer ' + auth.accessToken, 'Content-Type': 'application/json', 'If-Match': current.etag! }
  // Never notify a held candidate who is stored only in the app's contact field.
  const notify = view.attendeeEmails.length > 0 && args.notifyAttendees === true
  url.searchParams.set('sendUpdates', notify ? 'all' : 'none')
  if (args.action === 'cancel') {
    const response = await fetch(url, { method: 'DELETE', headers, cache: 'no-store' })
    if (response.status !== 404 && response.status !== 410 && !response.ok) {
      await providerJson(response, 'Could not cancel the Google Calendar meeting.')
    }
    return { cancelled: true, event: { ...view, status: 'cancelled', editable: false } }
  }
  const patch: Record<string, unknown> = {}
  if (args.action === 'reschedule') {
    const start = requireFutureMeeting(args.scheduledAt || '')
    const duration = cleanMeetingDuration(args.durationMinutes)
    patch.start = { dateTime: start.toISOString(), timeZone: TIME_ZONE }
    patch.end = { dateTime: new Date(start.getTime() + duration * 60000).toISOString(), timeZone: TIME_ZONE }
  } else if (args.action === 'invite') {
    const email = cleanMeetingEmail(args.email)
    if (!email) throw new GoogleCalendarError('A candidate email is required to send an invitation.', 400)
    if (current.end?.dateTime && new Date(current.end.dateTime).getTime() <= Date.now()) {
      throw new GoogleCalendarError('Reschedule this past meeting before sending an invitation.', 400)
    }
    if (email === auth.connection.googleEmail?.toLowerCase()) throw new GoogleCalendarError('Enter the candidate email, not the organizer email.', 400)
    if (view.attendeeEmails.some((existing) => existing.toLowerCase() === email)) {
      throw new GoogleCalendarError('That candidate is already invited. No duplicate invitation was sent.', 409)
    }
    patch.attendees = [...(current.attendees || []), { email }]
    url.searchParams.set('sendUpdates', 'all')
  } else {
    throw new GoogleCalendarError('Choose a valid meeting action.', 400)
  }
  // PATCH only the fields being edited: Google retains conferenceData, Meet
  // link, description, existing attendees, reminders, visibility and location.
  const response = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(patch), cache: 'no-store' })
  const updated = await providerJson(response, 'Could not update the Google Calendar meeting.')
  return { event: calendarEvent(updated, auth.connection.googleEmail) }
}

export async function listUpcomingGoogleCalendarEvents(maxResults = 50): Promise<GoogleCalendarEvent[]> {
  const auth = await getGoogleCalendarAccessToken()
  if (!auth) return []
  const url = eventUrl(auth)
  url.searchParams.set('timeMin', new Date().toISOString())
  url.searchParams.set('timeMax', new Date(Date.now() + 45 * 86400000).toISOString())
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('maxResults', String(Math.max(1, Math.min(250, maxResults))))
  const response = await fetch(url, { headers: { Authorization: 'Bearer ' + auth.accessToken }, cache: 'no-store' })
  const data = await response.json()
  if (!response.ok) throw new GoogleCalendarError(data?.error?.message || 'Could not load Google Calendar events.')
  return (data.items || []).map((event: ProviderEvent) => calendarEvent(event, auth.connection.googleEmail))
}

export function expectedGoogleCalendarEmail() {
  return BUSINESS_GOOGLE_EMAIL
}
