'use client'

import { useEffect } from 'react'
import { useCheckoutPolicy } from '@/components/public/useCheckoutPolicy'
import { exactPickupFeeForPolicy, isLateExactPickupTime } from '@/lib/nycCheckoutPolicy'
import {
  APPOINTMENT_SLOTS,
  APPOINTMENT_TIME_OPTIONS,
  EVENT_TIME_OPTIONS,
  EXACT_DELIVERY_TIME_OPTIONS,
  EXACT_PICKUP_TIME_OPTIONS,
  type StaffScheduleState,
  getRecommendedWindow,
  getValidDeliveryWindows,
  timeToMinutes,
} from '@/lib/nycOrderScheduling'

export default function NycAdminScheduleFields({
  deliveryType,
  onDeliveryTypeChange,
  value,
  onChange,
}: {
  deliveryType: 'delivery' | 'pickup'
  onDeliveryTypeChange: (value: 'delivery' | 'pickup') => void
  value: StaffScheduleState
  onChange: (next: StaffScheduleState) => void
}) {
  const checkoutPolicy = useCheckoutPolicy()
  const policy = checkoutPolicy?.policy ?? null
  const patch = (next: Partial<StaffScheduleState>) => onChange({ ...value, ...next })
  const validWindows = getValidDeliveryWindows(value.eventStartTime)
  const exactDeliveryOptions = value.eventStartTime
    ? EXACT_DELIVERY_TIME_OPTIONS.filter(option => timeToMinutes(option.value) <= timeToMinutes(value.eventStartTime))
    : EXACT_DELIVERY_TIME_OPTIONS
  const exactDeliveryOffered = policy?.exactDeliveryFee != null
  const exactPickupOffered = policy?.exactPickupFee != null
  const exactPickupOptions = EXACT_PICKUP_TIME_OPTIONS.filter(option =>
    policy?.lateExactPickupFee != null || !isLateExactPickupTime(option.value)
  )

  useEffect(() => {
    if (deliveryType !== 'delivery' || value.exactDeliveryRequested || !value.eventStartTime) return
    const valid = validWindows.some(window =>
      window.start === value.deliveryWindowStart && window.end === value.deliveryWindowEnd
    )
    if (valid) return
    const recommended = getRecommendedWindow(value.eventStartTime)
    if (recommended) patch({ deliveryWindowStart: recommended.start, deliveryWindowEnd: recommended.end })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryType, value.eventStartTime, value.exactDeliveryRequested])

  return (
    <div className="space-y-5" data-nyc-admin-schedule="checkout-policy-v1">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Rental method</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => onDeliveryTypeChange('delivery')} className={'min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold ' + (deliveryType === 'delivery' ? 'border-secondary bg-blue-50 text-dark' : 'border-gray-300 bg-white text-body')}>Delivery to Event</button>
          <button type="button" onClick={() => onDeliveryTypeChange('pickup')} className={'min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold ' + (deliveryType === 'pickup' ? 'border-secondary bg-blue-50 text-dark' : 'border-gray-300 bg-white text-body')}>Customer Pickup / Return</button>
        </div>
      </div>

      {deliveryType === 'delivery' ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-body">Event starts
              <select value={value.eventStartTime || ''} onChange={e => patch({ eventStartTime: e.target.value || null })} className="mt-1 w-full rounded border border-gray-300 px-3 py-2.5 text-sm">
                <option value="">Select start time</option>
                {EVENT_TIME_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="text-xs text-body">Event ends
              <select value={value.eventEndTime || ''} onChange={e => patch({ eventEndTime: e.target.value || null })} className="mt-1 w-full rounded border border-gray-300 px-3 py-2.5 text-sm">
                <option value="">Select end time</option>
                {EVENT_TIME_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-bold text-dark">Delivery timing</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => patch({ exactDeliveryRequested: false, exactDeliveryTime: null })} className={'rounded-lg border p-3 text-left text-sm ' + (!value.exactDeliveryRequested ? 'border-secondary bg-blue-50' : 'border-gray-300') }>
                <strong className="block">Standard delivery window</strong><span className="text-xs text-body">Included route window that ends before the event.</span>
              </button>
              <button type="button" disabled={!exactDeliveryOffered} onClick={() => exactDeliveryOffered && patch({ exactDeliveryRequested: true, deliveryWindowStart: null, deliveryWindowEnd: null })} className={'rounded-lg border p-3 text-left text-sm disabled:opacity-50 ' + (value.exactDeliveryRequested ? 'border-secondary bg-blue-50' : 'border-gray-300')}>
                <strong className="block">Guaranteed exact delivery</strong><span className="text-xs text-body">{exactDeliveryOffered ? '+$' + Number(policy?.exactDeliveryFee || 0).toFixed(2) : 'Not enabled in NYC checkout policy'}</span>
              </button>
            </div>
            {!value.exactDeliveryRequested ? (
              <label className="mt-3 block text-xs text-body">Delivery window
                <select value={value.deliveryWindowStart && value.deliveryWindowEnd ? value.deliveryWindowStart + '|' + value.deliveryWindowEnd : ''} onChange={e => {
                  const selected = validWindows.find(window => window.start + '|' + window.end === e.target.value)
                  patch({ deliveryWindowStart: selected?.start || null, deliveryWindowEnd: selected?.end || null })
                }} className="mt-1 w-full rounded border border-gray-300 px-3 py-2.5 text-sm">
                  <option value="">Select window</option>
                  {validWindows.map(window => <option key={window.start} value={window.start + '|' + window.end}>{window.label}</option>)}
                </select>
              </label>
            ) : (
              <label className="mt-3 block text-xs text-body">Guaranteed delivery time
                <select value={value.exactDeliveryTime || ''} onChange={e => patch({ exactDeliveryTime: e.target.value || null })} className="mt-1 w-full rounded border border-gray-300 px-3 py-2.5 text-sm">
                  <option value="">Select exact time</option>
                  {exactDeliveryOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            )}
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-bold text-dark">Pickup from event</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {([
                ['flexible','Flexible','Included'],
                ['requiredBy','Requested by','Not guaranteed'],
                ['exact','Exact',exactPickupOffered ? 'Guaranteed fee' : 'Not enabled'],
              ] as const).map(([type,label,helper]) => (
                <button key={type} type="button" disabled={type === 'exact' && !exactPickupOffered} onClick={() => patch({ pickupType: type })} className={'rounded-lg border p-3 text-left text-sm disabled:opacity-50 ' + (value.pickupType === type ? 'border-secondary bg-blue-50' : 'border-gray-300')}>
                  <strong className="block">{label}</strong><span className="text-xs text-body">{helper}</span>
                </button>
              ))}
            </div>
            {value.pickupType === 'requiredBy' && (
              <label className="mt-3 block text-xs text-body">Customer requests pickup by
                <select value={value.pickupRequiredByTime || ''} onChange={e => patch({ pickupRequiredByTime: e.target.value || null })} className="mt-1 w-full rounded border border-gray-300 px-3 py-2.5 text-sm">
                  <option value="">Select requested-by time</option>
                  {EXACT_PICKUP_TIME_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            )}
            {value.pickupType === 'exact' && exactPickupOffered && (
              <label className="mt-3 block text-xs text-body">Guaranteed pickup time
                <select value={value.exactPickupTime || ''} onChange={e => patch({ exactPickupTime: e.target.value || null })} className="mt-1 w-full rounded border border-gray-300 px-3 py-2.5 text-sm">
                  <option value="">Select exact pickup</option>
                  {exactPickupOptions.map(option => {
                    const fee = exactPickupFeeForPolicy(policy, option.value)
                    return <option key={option.value} value={option.value}>{option.label}{fee == null ? '' : ' (+$' + fee.toFixed(2) + ')'}</option>
                  })}
                </select>
              </label>
            )}
          </div>

          {value.eventStartTime && value.eventEndTime && timeToMinutes(value.eventEndTime) <= timeToMinutes(value.eventStartTime) && <p className="rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700">Event end time must be after the event start time.</p>}
        </>
      ) : (
        <div>
          <h3 className="text-sm font-bold text-dark">Customer pickup appointment</h3>
          <p className="mb-2 text-xs text-body">Use a clear office/warehouse appointment instead of delivery-route fields.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-body">Appointment
              <select value={value.appointmentSlot} onChange={e => patch({ appointmentSlot: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-3 py-2.5 text-sm">
                <option value="">Select appointment</option>
                {APPOINTMENT_SLOTS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            {value.appointmentSlot === 'specific' && (
              <label className="text-xs text-body">Specific time
                <select value={value.appointmentSpecificTime} onChange={e => patch({ appointmentSpecificTime: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-3 py-2.5 text-sm">
                  <option value="">Select time</option>
                  {APPOINTMENT_TIME_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            )}
          </div>
        </div>
      )}

      <p className="text-[11px] leading-4 text-gray-500">NYC exact-time fees come from the owner-approved checkout policy. This editor cannot invent or type a different exact-time price.</p>
    </div>
  )
}
