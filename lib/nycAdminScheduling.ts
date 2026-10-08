export type NycAdminScheduleState = {
  eventStartTime: string | null
  eventEndTime: string | null
  deliveryWindowStart: string | null
  deliveryWindowEnd: string | null
  exactDeliveryRequested: boolean
  exactDeliveryTime: string | null
  pickupType: 'flexible' | 'requiredBy' | 'exact'
  pickupRequiredByTime: string | null
  exactPickupTime: string | null
  appointmentSlot: string
  appointmentSpecificTime: string
}

export const DELIVERY_WINDOWS = [
  { start: '08:00', end: '10:00', label: '8:00 AM - 10:00 AM' },
  { start: '10:00', end: '12:00', label: '10:00 AM - 12:00 PM' },
  { start: '12:00', end: '14:00', label: '12:00 PM - 2:00 PM' },
  { start: '14:00', end: '16:00', label: '2:00 PM - 4:00 PM' },
  { start: '16:00', end: '18:00', label: '4:00 PM - 6:00 PM' },
] as const

export const APPOINTMENT_SLOTS = [
  { value: 'morning', label: 'Morning (9am - 12pm)' },
  { value: 'afternoon', label: 'Afternoon (12pm - 4pm)' },
  { value: 'evening', label: 'Evening (4pm - 6pm)' },
  { value: 'specific', label: 'Specific Time' },
] as const

export const EMPTY_NYC_ADMIN_SCHEDULE: NycAdminScheduleState = {
  eventStartTime: null,
  eventEndTime: null,
  deliveryWindowStart: null,
  deliveryWindowEnd: null,
  exactDeliveryRequested: false,
  exactDeliveryTime: null,
  pickupType: 'flexible',
  pickupRequiredByTime: null,
  exactPickupTime: null,
  appointmentSlot: '',
  appointmentSpecificTime: '',
}

export function formatScheduleTime(value?: string | null): string {
  if (!value) return ''
  const [hRaw, mRaw] = value.split(':')
  const h = Number(hRaw), m = Number(mRaw)
  if (!Number.isInteger(h) || !Number.isInteger(m)) return value
  const period = h >= 12 ? 'PM' : 'AM'
  return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + ' ' + period
}

export function timeToMinutes(value?: string | null): number {
  if (!value) return -1
  const [h, m] = value.split(':').map(Number)
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) return -1
  return h * 60 + m
}

export function buildTimeOptions(start: number, end: number) {
  const options: { value: string; label: string }[] = []
  for (let mins = start; mins <= end; mins += 30) {
    const h = Math.floor(mins / 60), m = mins % 60
    const value = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')
    options.push({ value, label: formatScheduleTime(value) })
  }
  return options
}

export const EVENT_TIME_OPTIONS = buildTimeOptions(7 * 60, 23 * 60 + 30)
export const EXACT_DELIVERY_TIME_OPTIONS = buildTimeOptions(8 * 60, 18 * 60)
export const EXACT_PICKUP_TIME_OPTIONS = buildTimeOptions(12 * 60, 23 * 60 + 30)
export const APPOINTMENT_TIME_OPTIONS = buildTimeOptions(9 * 60, 17 * 60)

export function validDeliveryWindows(eventStartTime?: string | null) {
  const eventMins = timeToMinutes(eventStartTime)
  if (eventMins < 0) return [...DELIVERY_WINDOWS]
  return DELIVERY_WINDOWS.filter(window => timeToMinutes(window.end) <= eventMins)
}

export function recommendedDeliveryWindow(eventStartTime?: string | null) {
  const valid = validDeliveryWindows(eventStartTime)
  if (!valid.length) return null
  const eventMins = timeToMinutes(eventStartTime)
  const buffered = valid.filter(window => eventMins < 0 || eventMins - timeToMinutes(window.end) >= 60)
  return (buffered.length ? buffered : valid)[(buffered.length ? buffered : valid).length - 1]
}

export function legacyScheduleLabels(schedule: NycAdminScheduleState, deliveryType: string) {
  if (deliveryType === 'pickup') {
    const slot = APPOINTMENT_SLOTS.find(option => option.value === schedule.appointmentSlot)
    const label = schedule.appointmentSlot === 'specific' && schedule.appointmentSpecificTime
      ? 'Specific Time: ' + formatScheduleTime(schedule.appointmentSpecificTime)
      : slot?.label || ''
    return { eventTimeSlot: label, pickupTimeSlot: label }
  }

  const eventTimeSlot = schedule.exactDeliveryRequested && schedule.exactDeliveryTime
    ? 'Exact Time: ' + formatScheduleTime(schedule.exactDeliveryTime)
    : DELIVERY_WINDOWS.find(window =>
        window.start === schedule.deliveryWindowStart && window.end === schedule.deliveryWindowEnd
      )?.label || (schedule.deliveryWindowStart && schedule.deliveryWindowEnd
        ? formatScheduleTime(schedule.deliveryWindowStart) + ' - ' + formatScheduleTime(schedule.deliveryWindowEnd)
        : '')

  let pickupTimeSlot = 'Flexible Pickup (after event, based on our route)'
  if (schedule.pickupType === 'requiredBy' && schedule.pickupRequiredByTime) {
    pickupTimeSlot = 'Pickup Requested By: ' + formatScheduleTime(schedule.pickupRequiredByTime)
  } else if (schedule.pickupType === 'exact' && schedule.exactPickupTime) {
    pickupTimeSlot = 'Exact Pickup Time: ' + formatScheduleTime(schedule.exactPickupTime)
  }
  return { eventTimeSlot, pickupTimeSlot }
}

export function scheduleIsValid(schedule: NycAdminScheduleState, deliveryType: string) {
  if (deliveryType === 'pickup') {
    return !!schedule.appointmentSlot && (schedule.appointmentSlot !== 'specific' || !!schedule.appointmentSpecificTime)
  }
  const eventValid = !!schedule.eventStartTime && !!schedule.eventEndTime &&
    timeToMinutes(schedule.eventEndTime) > timeToMinutes(schedule.eventStartTime)
  const deliveryValid = schedule.exactDeliveryRequested
    ? !!schedule.exactDeliveryTime && timeToMinutes(schedule.exactDeliveryTime) <= timeToMinutes(schedule.eventStartTime)
    : !!schedule.deliveryWindowStart && !!schedule.deliveryWindowEnd
  const pickupValid = schedule.pickupType === 'flexible' ||
    (schedule.pickupType === 'requiredBy' ? !!schedule.pickupRequiredByTime : !!schedule.exactPickupTime)
  return eventValid && deliveryValid && pickupValid
}
