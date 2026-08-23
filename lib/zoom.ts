// Helper for creating real Zoom meetings via a Server-to-Server OAuth app.
// Requires ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET environment
// variables. If they are not set, this safely no-ops (returns null) so the
// app falls back to the generic default Zoom link instead of breaking.

import { createHmac } from 'crypto'

async function getZoomAccessToken(): Promise<string | null> {
  const accountId = process.env.ZOOM_ACCOUNT_ID
  const clientId = process.env.ZOOM_CLIENT_ID
  const clientSecret = process.env.ZOOM_CLIENT_SECRET
  if (!accountId || !clientId || !clientSecret) return null

  const basic = Buffer.from(clientId + ':' + clientSecret).toString('base64')
  const res = await fetch(
    'https://zoom.us/oauth/token?grant_type=account_credentials&account_id=' + accountId,
    {
      method: 'POST',
      headers: { Authorization: 'Basic ' + basic },
    }
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.access_token || null
}

export interface ZoomMeetingInfo {
  joinUrl: string
  meetingId: string
  password: string
}

// Creates a real, unique Zoom meeting and returns its join info, or null if
// Zoom isn't configured yet or the API call fails for any reason.
export async function createZoomMeeting(
  customerName: string,
  startTimeIso: string,
  durationMinutes = 30
): Promise<ZoomMeetingInfo | null> {
  try {
    const accessToken = await getZoomAccessToken()
    if (!accessToken) return null

    const res = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: 'Meeting with ' + customerName,
        type: 2,
        start_time: startTimeIso,
        duration: durationMinutes,
        timezone: 'UTC',
        settings: {
          join_before_host: true,
          waiting_room: false,
        },
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.join_url) return null
    return {
      joinUrl: data.join_url,
      meetingId: String(data.id),
      password: data.password || '',
    }
  } catch (err) {
    console.error('Zoom meeting creation failed:', err)
    return null
  }
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// Generates a signed JWT for Zoom's Meeting SDK for Web, allowing a meeting to
// be embedded directly inside our own admin page instead of opening zoom.us.
// Requires ZOOM_SDK_KEY and ZOOM_SDK_SECRET environment variables (separate
// from the Server-to-Server OAuth credentials used above). Returns null if
// they are not set yet.
export function generateZoomSdkSignature(meetingNumber: string, role: 0 | 1): string | null {
  const sdkKey = process.env.ZOOM_SDK_KEY
  const sdkSecret = process.env.ZOOM_SDK_SECRET
  if (!sdkKey || !sdkSecret) return null

  const iat = Math.floor(Date.now() / 1000) - 30
  const exp = iat + 60 * 60 * 2

  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    appKey: sdkKey,
    sdkKey,
    mn: meetingNumber,
    role,
    iat,
    exp,
    tokenExp: exp,
  }

  const encodedHeader = base64url(JSON.stringify(header))
  const encodedPayload = base64url(JSON.stringify(payload))
  const signature = createHmac('sha256', sdkSecret)
    .update(encodedHeader + '.' + encodedPayload)
    .digest()
  const encodedSignature = base64url(signature)

  return encodedHeader + '.' + encodedPayload + '.' + encodedSignature
}
