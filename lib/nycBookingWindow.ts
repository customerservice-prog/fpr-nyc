export const NYC_PUBLIC_BOOKING_START = '2027-01-01'
export const NYC_PUBLIC_BOOKING_MESSAGE =
  'Riverdale / NYC online reservations are now open for 2027 events. Please choose an event date on or after January 1, 2027.'

export class NycPublicBookingDateError extends Error {
  readonly status = 409
  readonly code = 'nyc_2027_booking_only'
  constructor() {
    super(NYC_PUBLIC_BOOKING_MESSAGE)
    this.name = 'NycPublicBookingDateError'
  }
}

export function nycBookingDateKey(value: Date | string | number | null | undefined): string | null {
  if (value == null || value === '') return null
  if (typeof value === 'string') {
    const direct = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/)
    if (direct) return direct[1] + '-' + direct[2] + '-' + direct[3]
  }
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return null
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return y + '-' + m + '-' + d
}

export function isNycPublicBookingDateOpen(value: Date | string | number | null | undefined): boolean {
  const key = nycBookingDateKey(value)
  return !!key && key >= NYC_PUBLIC_BOOKING_START
}

export function requireNycPublicBookingDate(value: Date | string | number | null | undefined): void {
  if (!isNycPublicBookingDateOpen(value)) throw new NycPublicBookingDateError()
}
