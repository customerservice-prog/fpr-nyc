'use client'

import { useEffect } from 'react'
import { useCheckoutPolicy } from '@/components/public/useCheckoutPolicy'
import { exactPickupFeeForPolicy, isLateExactPickupTime } from '@/lib/nycCheckoutPolicy'
import {
  APPOINTMENT_SLOTS,
  APPOINTMENT_TIME_OPTIONS,
  DELIVERY_WINDOWS,
  EVENT_TIME_OPTIONS,
  EXACT_DELIVERY_TIME_OPTIONS,
  EXACT_PICKUP_TIME_OPTIONS,
  type NycAdminScheduleState,
  recommendedDeliveryWindow,
  timeToMinutes,
  validDeliveryWindows,
} from '@/lib/nycAdminScheduling'

export default function NycAdminScheduleFields({
  deliveryType,
  onDeliveryTypeChange,
  value,
  onChange,
}: {
  deliveryType: 'delivery' | 'pickup'
  onDeliveryTypeChange: (value: 'delivery' | 'pickup') => void
  value: NycAdminScheduleState
  onChange: (next: NycAdminScheduleState) => void
}) {
  const checkoutPolicy = useCheckoutPolicy()
  const policy = checkoutPolicy?.policy || null
  const patch = (next: Partial<NycAdminScheduleState>) => onChange({ ...value, ...next })
  const windows = validDeliveryWindows(value.eventStartTime)
  const exactDeliveryOffered = policy?.exactDeliveryFee != null
  const exactPickupOffered = policy?.exactPickupFee != null
  const pickupOptions = EXACT_PICKUP_TIME_OPTIONS.filter(option =>
    policy?.lateExactPickupFee != null || !isLateExactPickupTime(option.value)
  )
  const selectedPickupFee = exactPickupFeeForPolicy(policy, value.exactPickupTime)
  const exactDeliveryTimes = value.eventStartTime
    ? EXACT_DELIVERY_TIME_OPTIONS.filter(option => timeToMinutes(option.value) <= timeToMinutes(value.eventStartTime))
    : EXACT_DELIVERY_TIME_OPTIONS

  useEffect(() => {
    if (deliveryType !== 'delivery' || value.exactDeliveryRequested || !value.eventStartTime) return
    const currentValid = windows.some(window =>
      window.start === value.deliveryWindowStart && window.end === value.deliveryWindowEnd
    )
    if (currentValid) return
    const recommended = recommendedDeliveryWindow(value.eventStartTime)
    if (recommended) {
      onChange({ ...value, deliveryWindowStart: recommended.start, deliveryWindowEnd: recommended.end })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryType, value.eventStartTime, value.exactDeliveryRequested])

  return (
    <div className="space-y-5" data-nyc-admin-schedule="checkout-policy-v1">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Rental method</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => onDeliveryTypeChange('delivery')} className={'min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold ' + (deliveryType === 'delivery' ? 'border-secondary bg-blue-50 text-dark' : 'border-gray-300 bg-white text-body')}>Delivery to Event</button>
          <button type="button" onClick={() => onDeliveryTypeChange('pickup')} className={'min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold ' + (deliveryType === 'pickup' ? 'border-secondary bg-blue-50 text-dark' : 'border-gray-300 bg-white text-body')}>Customer Pickup — Riverdale</button>
        </div>
      </div>

      {deliveryType === 'delivery' ? (
        <>
          <div>
            <h3 className="text-sm font-bold text-dark">1. Event Time</h3>
            <p className="mb-2 text-xs text-body">The actual event start and end time, not the truck arrival time.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs text-body">Event starts
                <select value={value.eventStartTime || ''} onChange={event => patch({ eventStartTime: event.target.value || null })} className="mt-1 w-full rounded border border-gray-300 px-3 py-2.5 text-sm">
                  <option value="">Select start time</option>
                  {EVENT_TIME_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="text-xs text-body">Event ends
                <select value={value.eventEndTime || ''} onChange={event => patch({ eventEndTime: event.target.value || null })} className="mt-1 w-full rounded border border-gray-300 px-3 py-2.5 text-sm">
                  <option value="">Select end time</option>
                  {EVENT_TIME_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-bold text-dark">2. Delivery Time</h3>
            <p className="mb-3 text-xs text-body">Use a standard 2-hour delivery window, or the owner-approved guaranteed exact-time option when available.</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => patch({ exactDeliveryRequested: false, exactDeliveryTime: null })} className={'min-h-12 rounded-lg border px-3 py-2 text-left text-sm ' + (!value.exactDeliveryRequested ? 'border-secondary bg-blue-50' : 'border-gray-300 bg-white')}>
                <strong className="block">Standard delivery window</strong><span className="text-[11px] text-body">Included in normal delivery routing</span>
              </button>
              <button type="button" disabled={!exactDeliveryOffered} onClick={() => exactDeliveryOffered && patch({ exactDeliveryRequested: true, deliveryWindowStart: null, deliveryWindowEnd: null })} className={'min-h-12 rounded-lg border px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50 ' + (value.exactDeliveryRequested ? 'border-secondary bg-blue-50' : 'border-gray-300 bg-white')}>
                <strong className="block">Guaranteed exact delivery</strong>
                <span className="text-[11px] text-body">{exactDeliveryOffered ? '+$' + Number(policy?.exactDeliveryFee || 0).toFixed(2) + ' · NYC approved policy' : 'Not currently offered by NYC checkout policy'}</span>
              </button>
            </div>

            {!value.exactDeliveryRequested ? (
              <label className="mt-3 block text-xs text-body">Delivery window
                <select value={value.deliveryWindowStart && value.deliveryWindowEnd ? value.deliveryWindowStart + '|' + value.deliveryWindowEnd : ''} onChange={event => {
                  const found = DELIVERY_WINDOWS.find(window => window.start + '|' + window.end === event.target.value)
                  patch({ deliveryWindowStart: found?.start || null, deliveryWindowEnd: found?.end || null })
                }} className="mt-1 w-full rounded border border-gray-300 px-3 py-2.5 text-sm">
                  <option value="">Select delivery window</option>
                  {windows.map(window => <option key={window.start} value={window.start + '|' + window.end}>{window.label}</option>)}
                </select>
              </label>
            ) : (
              <label className="mt-3 block text-xs text-body">Guaranteed delivery time
                <select value={value.exactDeliveryTime || ''} onChange={event => patch({ exactDeliveryTime: event.target.value || null })} className="mt-1 w-full rounded border border-gray-300 px-3 py-2.5 text-sm">
                  <option value="">Select exact delivery time</option>
                  {exactDeliveryTimes.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            )}
            {!!value.eventStartTime && !value.exactDeliveryRequested && !windows.length && <p className="mt-2 rounded bg-red-50 p-3 text-xs font-medium text-red-700">No standard delivery window ends before this event starts. Adjust the event start time or use an approved exact delivery option.</p>}
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-bold text-dark">3. Pickup From Event</h3>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button type="button" onClick={() => patch({ pickupType: 'flexible', pickupRequiredByTime: null, exactPickupTime: null })} className={'min-h-12 rounded-lg border px-2 py-2 text-left text-sm ' + (value.pickupType === 'flexible' ? 'border-secondary bg-blue-50' : 'border-gray-300 bg-white')}><strong className="block">Flexible</strong><span className="text-[11px] text-body">Based on route</span></button>
              <button type="button" onClick={() => patch({ pickupType: 'requiredBy', exactPickupTime: null })} className={'min-h-12 rounded-lg border px-2 py-2 text-left text-sm ' + (value.pickupType === 'requiredBy' ? 'border-secondary bg-blue-50' : 'border-gray-300 bg-white')}><strong className="block">Requested by</strong><span className="text-[11px] text-body">Not guaranteed</span></button>
              <button type="button" disabled={!exactPickupOffered} onClick={() => exactPickupOffered && patch({ pickupType: 'exact', pickupRequiredByTime: null })} className={'min-h-12 rounded-lg border px-2 py-2 text-left text-sm disabled:opacity-50 ' + (value.pickupType === 'exact' ? 'border-secondary bg-blue-50' : 'border-gray-300 bg-white')}><strong className="block">Guaranteed exact</strong><span className="text-[11px] text-body">{exactPickupOffered ? 'NYC approved fee' : 'Not offered by policy'}</span></button>
            </div>
            {value.pickupType === 'flexible' && <p className="mt-2 rounded-lg bg-gray-50 p-3 text-xs text-body">Pickup happens after the event based on the route. No guaranteed-time fee.</p>}
            {value.pickupType === 'requiredBy' && <label className="mt-3 block text-xs text-body">Customer requests pickup by
              <select value={value.pickupRequiredByTime || ''} onChange={event => patch({ pickupRequiredByTime: event.target.value || null })} className="mt-1 w-full rounded border border-gray-300 px-3 py-2.5 text-sm">
                <option value="">Select requested-by time</option>{EXACT_PICKUP_TIME_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>}
            {value.pickupType === 'exact' && <label className="mt-3 block text-xs text-body">Guaranteed pickup time
              <select value={value.exactPickupTime || ''} onChange={event => patch({ exactPickupTime: event.target.value || null })} className="mt-1 w-full rounded border border-gray-300 px-3 py-2.5 text-sm">
                <option value="">Select exact pickup time</option>{pickupOptions.map(option => {
                  const fee = exactPickupFeeForPolicy(policy, option.value)
                  return <option key={option.value} value={option.value}>{option.label}{fee != null ? ' (+$' + Number(fee).toFixed(2) + ')' : ''}</option>
                })}
              </select>
              {value.exactPickupTime && selectedPickupFee != null && <span className="mt-1 block text-[11px] text-body">{'Approved fee: $' + Number(selectedPickupFee).toFixed(2)}</span>}
            </label>}
          </div>
        </>
      ) : (
        <div>
          <h3 className="text-sm font-bold text-dark">Riverdale Customer Pickup Appointment</h3>
          <p className="mb-2 text-xs text-body">This is an office-created customer pickup/return appointment. NYC public checkout remains delivery-only.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs text-body">Appointment
              <select value={value.appointmentSlot} onChange={event => patch({ appointmentSlot: event.target.value })} className="mt-1 w-full rounded border border-gray-300 px-3 py-2.5 text-sm">
                <option value="">Select appointment</option>{APPOINTMENT_SLOTS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            {value.appointmentSlot === 'specific' && <label className="text-xs text-body">Specific time
              <select value={value.appointmentSpecificTime} onChange={event => patch({ appointmentSpecificTime: event.target.value })} className="mt-1 w-full rounded border border-gray-300 px-3 py-2.5 text-sm">
                <option value="">Select time</option>{APPOINTMENT_TIME_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>}
          </div>
        </div>
      )}

      {deliveryType === 'delivery' && value.eventStartTime && value.eventEndTime && timeToMinutes(value.eventEndTime) <= timeToMinutes(value.eventStartTime) && <p className="rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700">Event end time must be after the event start time.</p>}
      {deliveryType === 'delivery' && value.exactDeliveryRequested && value.exactDeliveryTime && value.eventStartTime && timeToMinutes(value.exactDeliveryTime) > timeToMinutes(value.eventStartTime) && <p className="rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700">Delivery must be at or before the event start time.</p>}
      <p className="text-[11px] leading-4 text-gray-500">Times saved here feed customer emails, office scheduling, and driver operations. Exact-time fees come only from the current NYC checkout policy.</p>
    </div>
  )
}
