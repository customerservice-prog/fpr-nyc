export const MEETING_TIME_ZONE = 'America/New_York'

export class MeetingInputError extends Error {
  status = 400
}

// Existing Meeting rows store New York wall-clock components as UTC, rather
// than an instant. Keep that storage contract while converting at boundaries.
export function wallClockValue(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(/Z$|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`)
  if (!Number.isFinite(date.getTime())) throw new MeetingInputError('Enter a valid date and time.')
  return date.toISOString().slice(0, 16)
}

export function instantToEasternWall(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) throw new MeetingInputError('Enter a valid date and time.')
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MEETING_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`
}

export function parseMeetingWallClock(value: string): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    throw new MeetingInputError('Enter the meeting date and time in New York time.')
  }
  const parsed = new Date(`${value}:00.000Z`)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 16) !== value) {
    throw new MeetingInputError('Enter a valid date and time.')
  }
  return parsed
}

export function wallClockToInstant(value: Date | string): Date {
  const wall = typeof value === 'string' && value.length === 16 ? value : wallClockValue(value)
  const stored = parseMeetingWallClock(wall)
  // New York uses UTC-4 or UTC-5. Matching both candidates also detects the
  // spring missing hour and the fall repeated hour instead of guessing.
  const candidates = [4, 5].map((hours) => new Date(stored.getTime() + hours * 60 * 60 * 1000))
    .filter((date) => instantToEasternWall(date) === wall)
  if (candidates.length !== 1) {
    throw new MeetingInputError(candidates.length
      ? 'That time occurs twice when daylight saving time ends. Choose a time outside the repeated 1 AM hour.'
      : 'That time does not exist when daylight saving time starts. Choose a different time.')
  }
  return candidates[0]
}

export function cleanMeetingDuration(value: unknown): number {
  const duration = value == null || value === '' ? 20 : Number(value)
  if (!Number.isInteger(duration) || duration < 10 || duration > 120) {
    throw new MeetingInputError('Choose a duration between 10 and 120 minutes.')
  }
  return duration
}

export function cleanMeetingEmail(value: unknown): string | null {
  if (value == null || value === '') return null
  if (typeof value !== 'string' || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    throw new MeetingInputError('Enter a valid candidate email address.')
  }
  return value.trim().toLowerCase()
}

export const MEETING_DECISIONS = ['undecided', 'advance', 'hold', 'not_selected', 'hired'] as const

export function cleanMeetingDecision(value: unknown): string | null {
  if (value == null || value === '' || value === 'undecided') return null
  if (typeof value !== 'string' || !(MEETING_DECISIONS as readonly string[]).includes(value)) {
    throw new MeetingInputError('Choose a valid interview decision.')
  }
  return value
}

export function requireFutureMeeting(value: Date | string): Date {
  const instant = wallClockToInstant(value)
  if (instant.getTime() <= Date.now()) throw new MeetingInputError('Choose a meeting time in the future.')
  return instant
}
