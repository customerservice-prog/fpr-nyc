import { exactPickupFeeForPolicy, type NycCheckoutPolicy } from '@/lib/nycCheckoutPolicy'

export type DeliveryWindow = { start: string; end: string; label: string }

export type StaffScheduleState = {
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

export const DELIVERY_WINDOWS: DeliveryWindow[] = [
  { start: '08:00', end: '10:00', label: '8:00 AM - 10:00 AM' },
  { start: '10:00', end: '12:00', label: '10:00 AM - 12:00 PM' },
  { start: '12:00', end: '14:00', label: '12:00 PM - 2:00 PM' },
  { start: '14:00', end: '16:00', label: '2:00 PM - 4:00 PM' },
  { start: '16:00', end: '18:00', label: '4:00 PM - 6:00 PM' },
]

export const APPOINTMENT_SLOTS = [
  { value: 'morning', label: 'Morning (9am - 12pm)' },
  { value: 'afternoon', label: 'Afternoon (12pm - 4pm)' },
  { value: 'evening', label: 'Evening (4pm - 6pm)' },
  { value: 'specific', label: 'Specific Time' },
] as const

export const EMPTY_STAFF_SCHEDULE: StaffScheduleState = {
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

export function formatScheduleTime(value?: string | null) {
  if (!value) return ''
  const [hRaw, mRaw] = value.split(':')
  const h24 = Number(hRaw), m = Number(mRaw)
  if (!Number.isInteger(h24) || !Number.isInteger(m) || h24 < 0 || h24 > 23 || m < 0 || m > 59) return value
  const period = h24 >= 12 ? 'PM' : 'AM'
  return (h24 % 12 || 12) + ':' + String(m).padStart(2, '0') + ' ' + period
}

export function timeToMinutes(value?: string | null) {
  if (!value) return -1
  const [h, m] = value.split(':').map(Number)
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) return -1
  return h * 60 + m
}

function buildTimeOptions(startMins: number, endMins: number) {
  const options: Array<{ value: string; label: string }> = []
  for (let mins = startMins; mins <= endMins; mins += 30) {
    const value = String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0')
    options.push({ value, label: formatScheduleTime(value) })
  }
  return options
}

export const EVENT_TIME_OPTIONS = buildTimeOptions(7 * 60, 23 * 60 + 30)
export const EXACT_DELIVERY_TIME_OPTIONS = buildTimeOptions(8 * 60, 18 * 60)
export const EXACT_PICKUP_TIME_OPTIONS = buildTimeOptions(12 * 60, 23 * 60 + 30)
export const APPOINTMENT_TIME_OPTIONS = buildTimeOptions(9 * 60, 17 * 60)

export function getValidDeliveryWindows(eventStartTime?: string | null) {
  const eventMins = timeToMinutes(eventStartTime)
  if (eventMins < 0) return DELIVERY_WINDOWS
  return DELIVERY_WINDOWS.filter(window => timeToMinutes(window.end) <= eventMins)
}

export function getRecommendedWindow(eventStartTime?: string | null) {
  const valid = getValidDeliveryWindows(eventStartTime)
  if (!valid.length) return null
  const eventMins = timeToMinutes(eventStartTime)
  if (eventMins < 0) return valid[valid.length - 1]
  const buffered = valid.filter(window => eventMins - timeToMinutes(window.end) >= 60)
  return buffered.length ? buffered[buffered.length - 1] : valid[valid.length - 1]
}

function pickupAppointmentFromLegacy(label?: string | null) {
  const value = String(label || '')
  if (/^Specific Time:/i.test(value)) return { appointmentSlot: 'specific', appointmentSpecificTime: value.replace(/^Specific Time:\s*/i, '') }
  const match = APPOINTMENT_SLOTS.find(slot => slot.label === value)
  return { appointmentSlot: match?.value || '', appointmentSpecificTime: '' }
}

export function staffScheduleFromOrder(order: any): StaffScheduleState {
  const appointment = pickupAppointmentFromLegacy(order?.eventTimeSlot || order?.pickupTimeSlot)
  return {
    eventStartTime: order?.eventStartTime || null,
    eventEndTime: order?.eventEndTime || null,
    deliveryWindowStart: order?.deliveryWindowStart || null,
    deliveryWindowEnd: order?.deliveryWindowEnd || null,
    exactDeliveryRequested: Boolean(order?.exactDeliveryRequested),
    exactDeliveryTime: order?.exactDeliveryTime || null,
    pickupType: ['requiredBy', 'exact'].includes(order?.pickupType) ? order.pickupType : 'flexible',
    pickupRequiredByTime: order?.pickupRequiredByTime || null,
    exactPickupTime: order?.exactPickupTime || null,
    appointmentSlot: appointment.appointmentSlot,
    appointmentSpecificTime: appointment.appointmentSpecificTime,
  }
}

export function scheduleLegacyLabels(schedule: StaffScheduleState, deliveryType: string) {
  if (deliveryType === 'pickup') {
    const slot = APPOINTMENT_SLOTS.find(option => option.value === schedule.appointmentSlot)
    const label = schedule.appointmentSlot === 'specific' && schedule.appointmentSpecificTime
      ? 'Specific Time: ' + schedule.appointmentSpecificTime
      : slot?.label || ''
    return { eventTimeSlot: label, pickupTimeSlot: label }
  }

  const eventTimeSlot = schedule.exactDeliveryRequested && schedule.exactDeliveryTime
    ? 'Exact Time: ' + formatScheduleTime(schedule.exactDeliveryTime)
    : DELIVERY_WINDOWS.find(window => window.start === schedule.deliveryWindowStart && window.end === schedule.deliveryWindowEnd)?.label
      || (schedule.deliveryWindowStart && schedule.deliveryWindowEnd
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

export function scheduleIsValid(schedule: StaffScheduleState, deliveryType: string) {
  if (deliveryType === 'pickup') {
    return !!schedule.appointmentSlot && (schedule.appointmentSlot !== 'specific' || !!schedule.appointmentSpecificTime)
  }
  const validEvent = !!schedule.eventStartTime && !!schedule.eventEndTime &&
    timeToMinutes(schedule.eventEndTime) > timeToMinutes(schedule.eventStartTime)
  const validDelivery = schedule.exactDeliveryRequested
    ? !!schedule.exactDeliveryTime && timeToMinutes(schedule.exactDeliveryTime) <= timeToMinutes(schedule.eventStartTime)
    : !!schedule.deliveryWindowStart && !!schedule.deliveryWindowEnd &&
      timeToMinutes(schedule.deliveryWindowEnd) <= timeToMinutes(schedule.eventStartTime)
  const validPickup = schedule.pickupType === 'flexible' ||
    (schedule.pickupType === 'requiredBy' ? !!schedule.pickupRequiredByTime : !!schedule.exactPickupTime)
  return validEvent && validDelivery && validPickup
}

export function scheduleFeesForPolicy(schedule: StaffScheduleState, deliveryType: string, policy: NycCheckoutPolicy | null) {
  if (deliveryType === 'pickup') return { exactDeliveryFee: 0, exactPickupFee: 0 }
  return {
    exactDeliveryFee: schedule.exactDeliveryRequested && schedule.exactDeliveryTime && policy?.exactDeliveryFee != null
      ? policy.exactDeliveryFee : 0,
    exactPickupFee: schedule.pickupType === 'exact' && schedule.exactPickupTime
      ? (exactPickupFeeForPolicy(policy, schedule.exactPickupTime) ?? 0) : 0,
  }
}
