import { wallClockToInstant } from '@/lib/meetingTime'

export interface Meeting {
  id: string
  customerName: string
  email: string | null
  scheduledAt: string | null
  notes: string | null
  zoomLink: string | null
  zoomMeetingId?: string | null
  googleMeetLink: string | null
  googleCalendarHtmlLink: string | null
  googleEventId: string | null
  meetingProvider: string
  durationMinutes: number
  completed: boolean
  pending: boolean
  token: string | null
  cancelledAt?: string | null
  invitedAt?: string | null
  candidateConfirmedAt?: string | null
  linkSentAt?: string | null
  decision?: string | null
}

export interface CalendarEvent {
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

export interface MeetingView {
  key: string
  name: string
  local?: Meeting
  event?: CalendarEvent
  start: string | null
  durationMinutes: number
  videoLink: string | null
  attendees: string[]
  cancelled: boolean
  past: boolean
  history: boolean
  pending: boolean
  candidateConfirmed: boolean
  linkSent: boolean
  decision: string
  status: string
  tone: 'gray' | 'amber' | 'green' | 'red'
}

export function formatMeetingTime(value: string | null, zone: 'America/New_York' | 'Asia/Manila') {
  if (!value) return 'Time not selected'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'Time unavailable'
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZone: zone, timeZoneName: 'short',
  }).format(date)
}

export function mergeMeetings(meetings: Meeting[], events: CalendarEvent[], now = Date.now()): MeetingView[] {
  const byEvent = new Map(events.map(event => [event.id, event]))
  const linked = new Set(meetings.map(meeting => meeting.googleEventId).filter(Boolean))
  const entries: Array<{ local?: Meeting; event?: CalendarEvent }> = [
    ...meetings.map(local => ({ local, event: local.googleEventId ? byEvent.get(local.googleEventId) : undefined })),
    ...events.filter(event => !linked.has(event.id)).map(event => ({ event })),
  ]
  return entries.map(({ local, event }) => {
    let start = event?.start || null
    if (!start && local?.scheduledAt) {
      try { start = wallClockToInstant(local.scheduledAt.slice(0, 16)).toISOString() } catch { /* Show unavailable legacy time safely. */ }
    }
    const durationMinutes = event?.start && event.end
      ? Math.max(1, Math.round((new Date(event.end).getTime() - new Date(event.start).getTime()) / 60000))
      : local?.durationMinutes || 20
    const cancelled = !!local?.cancelledAt || event?.status === 'cancelled'
    const past = !!start && new Date(start).getTime() + durationMinutes * 60000 < now
    const pending = !!local?.pending && !cancelled
    const attendees = event?.attendeeEmails || []
    const invited = event ? attendees.length > 0 : !!local?.invitedAt
    const description = (event?.description || '').toLowerCase()
    const inferredConfirmed = /candidate confirmed|confirmed this interview|confirmed the interview/.test(description)
    const inferredLinkSent = /(meet|meeting|video) link (?:was )?sent/.test(description)
    const candidateConfirmed = local ? !!local.candidateConfirmedAt : inferredConfirmed
    const linkSent = local ? !!local.linkSentAt : inferredLinkSent
    const decision = local?.decision || 'undecided'
    const invitationStatus = candidateConfirmed
      ? (linkSent ? 'Confirmed · link sent' : 'Confirmed in candidate chat')
      : invited ? 'Calendar guests added' : event ? 'Held · no Calendar guests' : local?.googleEventId ? 'Calendar status not loaded' : 'Saved interview'
    const status = cancelled ? 'Canceled' : local?.completed ? 'Completed' : past ? 'Past' : pending ? 'Awaiting time selection' : invitationStatus
    return {
      key: local ? `local:${local.id}` : `google:${event!.id}`,
      name: local?.customerName || event?.summary || 'Untitled meeting', local, event, start, durationMinutes,
      videoLink: event?.meetLink || local?.googleMeetLink || local?.zoomLink || null,
      attendees, cancelled, past, history: cancelled || !!local?.completed || past, pending,
      candidateConfirmed, linkSent, decision, status,
      tone: cancelled ? 'red' : past || local?.completed ? 'gray' : candidateConfirmed || invited ? 'green' : 'amber',
    } as MeetingView
  }).sort((a, b) => {
    if (!a.start) return -1
    if (!b.start) return 1
    return new Date(a.start).getTime() - new Date(b.start).getTime()
  })
}

export function meetingDraft(meeting: MeetingView, origin: string) {
  const name = meeting.local?.customerName || meeting.name.replace(/^Interview:\s*/i, '').replace(/\s*[—–-]\s*Friendly Party Rental.*$/i, '')
  if (meeting.pending && meeting.local?.token) {
    return `Hi ${name},\n\nPlease choose a date and time for our Friendly Party Rental interview:\n${origin}/schedule/${meeting.local.token}\n\nThe scheduling page shows the next steps when you select a time.\n\nThank you!`
  }
  const closing = meeting.candidateConfirmed
    ? 'Looking forward to speaking with you!'
    : 'Please confirm whether this time works for you.'
  return `Hi ${name},\n\nHere are the details for our ${meeting.durationMinutes}-minute Friendly Party Rental interview:\n\nNew York: ${formatMeetingTime(meeting.start, 'America/New_York')}\nPhilippines: ${formatMeetingTime(meeting.start, 'Asia/Manila')}\n\nBefore the interview, please open or print this practice quote sheet and keep it with you:\n${origin}/interview-practice-sheet\n\nWe will use it for a short practice customer order. You do not need to know our prices from memory - if you are unsure, explain what you would check or verify.\n\n${meeting.videoLink ? `Join the Google Meet: ${meeting.videoLink}\n\n` : ''}${closing}\n\nThank you!`
}
