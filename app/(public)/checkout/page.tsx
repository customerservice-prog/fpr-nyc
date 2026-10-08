'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useCart, DEFAULT_SCHEDULING_DETAILS } from '@/components/public/CartContext'
import { BUSINESS, formatCurrency, calculateReturnDateInfo, formatDateShort } from '@/lib/utils'
import { trackEvent } from '@/lib/gtag'
import BookingCalendar from '@/components/public/BookingCalendar'
import { Pencil } from 'lucide-react'
import { useCheckoutPolicy } from '@/components/public/useCheckoutPolicy'
import { exactPickupFeeForPolicy, isLateExactPickupTime } from '@/lib/nycCheckoutPolicy'
import { formatTaxRatePercent } from '@/lib/nycSalesTax'
import { APPOINTMENT_SLOTS, APPOINTMENT_TIME_OPTIONS, DELIVERY_WINDOWS, EVENT_TIME_OPTIONS, EXACT_DELIVERY_TIME_OPTIONS as EXACT_DELIVERY_TIME_OPTIONS_FULL, EXACT_PICKUP_TIME_OPTIONS, formatScheduleTime as fmtT, getRecommendedWindow, getValidDeliveryWindows, timeToMinutes } from '@/lib/nycOrderScheduling'

interface CheckoutForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  eventAddress: string
  eventCity: string
  eventState: string
  eventZip: string
  deliveryType: string
  couponCode: string
  damageWaiver: boolean
  durationTierId: string
  specialRequests: string[]
  tentSurfaceType: string
  tentSurfaceArea: string
  notes: string
}

interface PricingTier {
  id: string
  label: string
  minDays: number
  maxDays: number | null
  percent: number
}

interface SpecialRequestFee {
  id: string
  name: string
  amount: number
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, subtotal, eventDate, eventTimeSlot, pickupTimeSlot, deliveryType: cartDeliveryType, exactTimeRequested, schedulingDetails, durationTierId: cartDurationTierId, loaded, setEventDate, setEventTimeSlot, setPickupTimeSlot, setDeliveryType, setExactTimeRequested, setSchedulingDetails } = useCart()
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CheckoutForm>()
  const [loading, setLoading] = useState(false)
  const [sendingQuote, setSendingQuote] = useState(false)
  const [tiers, setTiers] = useState<PricingTier[]>([])
  const [fees, setFees] = useState<SpecialRequestFee[]>([])
  const [closedDates, setClosedDates] = useState<string[]>([])
  const [editingSchedule, setEditingSchedule] = useState(false)
  const [editDate, setEditDate] = useState<Date | null>(null)
  const [editMethod, setEditMethod] = useState<'delivery' | 'pickup'>('delivery')
  const [editEventStartTime, setEditEventStartTime] = useState('')
  const [editEventEndTime, setEditEventEndTime] = useState('')
  const [editWantsExactDelivery, setEditWantsExactDelivery] = useState(false)
  const [editExactDeliveryTime, setEditExactDeliveryTime] = useState('')
  const [editDeliveryWindow, setEditDeliveryWindow] = useState<{ start: string; end: string; label: string } | null>(null)
  const [editPickupType, setEditPickupType] = useState<'flexible' | 'requiredBy' | 'exact'>('flexible')
  const [editPickupRequiredByTime, setEditPickupRequiredByTime] = useState('')
  const [editExactPickupTime, setEditExactPickupTime] = useState('')
  const [editAppointmentSlot, setEditAppointmentSlot] = useState('')
  const [editAppointmentSpecificTime, setEditAppointmentSpecificTime] = useState('')
  // Optional fees are offered only when the owner-approved checkout policy includes them.
  const checkoutPolicy = useCheckoutPolicy()
  const approvedPolicy = checkoutPolicy?.policy ?? null
  const exactDeliveryFee = approvedPolicy?.exactDeliveryFee ?? null
  const exactPickupOffered = approvedPolicy?.exactPickupFee != null
  const damageWaiverPercent = approvedPolicy?.damageWaiverPercent ?? null
  // Advisory notice for the server's minimum (rentals before fees, discounts and tax). The payment page's
  // server quote is the authority, so a stale cart price never blocks checkout here.
  const minimumOrderSubtotal = approvedPolicy?.minimumOrderSubtotal ?? 0
  const belowMinimum = approvedPolicy !== null && minimumOrderSubtotal > 0 && subtotal < minimumOrderSubtotal
  const editExactPickupTimeOptions = EXACT_PICKUP_TIME_OPTIONS.filter((opt) => approvedPolicy?.lateExactPickupFee != null || !isLateExactPickupTime(opt.value))
  const editExactPickupFee = exactPickupFeeForPolicy(approvedPolicy, editExactPickupTime)

  useEffect(() => {
    fetch('/api/pricing-tiers')
      .then((r) => r.json())
      .then((data) => setTiers(data.tiers || []))
      .catch(() => setTiers([]))

    fetch('/api/special-request-fees')
      .then((r) => r.json())
      .then((data) => setFees(data.fees || []))
      .catch(() => setFees([]))

    fetch('/api/closed-dates')
      .then((r) => r.json())
      .then((data) => setClosedDates(data.dates || []))
      .catch(() => setClosedDates([]))
  }, [])

  useEffect(() => {
    if (loaded) {
      if (cartDeliveryType !== 'delivery') setDeliveryType('delivery')
      setValue('deliveryType', 'delivery')
    }
  }, [loaded, cartDeliveryType, setDeliveryType, setValue])


  useEffect(() => {
    if (!editEventStartTime) return
    const valid = getValidDeliveryWindows(editEventStartTime)
    setEditDeliveryWindow((prev) => {
      if (prev && valid.some((w) => w.start === prev.start && w.end === prev.end)) return prev
      return getRecommendedWindow(editEventStartTime)
    })
  }, [editEventStartTime, editWantsExactDelivery])

  const selectedTierId = cartDurationTierId
  const selectedTier = tiers.find((t) => t.id === selectedTierId) || tiers[0]
  const isSingleDay = !selectedTier || (selectedTier.minDays <= 1 && (selectedTier.maxDays ?? 1) <= 1)
  const hasTablesTentsItem = items.some((i) => i.pricingProfile === 'tables_tents')
  const hasTentItem = items.some((i) => i.pricingProfile === 'tables_tents' && /tent/i.test(i.name))
  const hasBounceItem = items.some((i) => i.pricingProfile === 'bounce_waterslide')
  const hasNewScheduling = !!schedulingDetails?.eventStartTime
  const exactTimeFee = fees.find((fee) => fee.name.toLowerCase().includes('exact'))
  const visibleFees = fees.filter((fee) => {
    if (fee.name.toLowerCase().includes('exact')) return false
    return fee.name.toLowerCase().includes('overnight') ? hasBounceItem : hasTablesTentsItem
  })
  const durationAmount = selectedTier ? Math.round(subtotal * (selectedTier.percent / 100) * 100) / 100 : 0
  const returnDateInfo = selectedTier && eventDate ? calculateReturnDateInfo(eventDate, selectedTier.minDays, selectedTier.maxDays) : ''
  const schedulingFeeTotal = hasNewScheduling ? (schedulingDetails.exactDeliveryFee || 0) + (schedulingDetails.exactPickupFee || 0) : 0

  if (!items.length || !eventDate) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-body mb-4">Your cart is empty or no event date selected.</p>
        <a href="/order-by-date" className="btn-primary inline-block">Start Booking</a>
      </div>
    )
  }

  const onSubmit = async (data: CheckoutForm) => {
    setLoading(true)
    try {
      const specialRequests = Array.isArray(data.specialRequests)
        ? [...data.specialRequests]
        : (data.specialRequests ? [data.specialRequests] : [])
      if (!hasNewScheduling && exactTimeRequested && exactTimeFee && !specialRequests.includes(exactTimeFee.id)) {
        specialRequests.push(exactTimeFee.id)
      }
      const checkoutDraftKey = sessionStorage.getItem('checkout_draft_key') || (globalThis.crypto?.randomUUID?.() || ('draft_' + Date.now() + '_' + Math.random().toString(36).slice(2)))
      sessionStorage.setItem('checkout_draft_key', checkoutDraftKey)
      const finalData = { ...data, checkoutDraftKey, deliveryType: 'delivery', specialRequests, schedulingDetails: hasNewScheduling ? schedulingDetails : null, durationTierId: selectedTierId || null }
      sessionStorage.setItem('checkout_data', JSON.stringify(finalData))
      try {
        const draftRes = await fetch('/api/checkout/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...finalData,
            stage: 'details_completed',
            eventDate,
            eventTimeSlot,
            pickupTimeSlot,
            deliveryType: 'delivery',
            items: items.map((item) => ({ id: item.id, name: item.selectedColor ? item.name + ' — ' + item.selectedColor : item.name, quantity: item.quantity, unitPrice: item.price })),
            subtotal,
          }),
        })
        const draftResult = await draftRes.json().catch(() => ({}))
        if (draftResult.requiresAssistance) {
          router.push('/checkout/assistance')
          return
        }
      } catch {
        // Funnel tracking is best-effort and must never stop a valid checkout.
      }
      trackEvent('begin_checkout', {
        value: subtotal,
        currency: 'USD',
        items: items.map((item) => ({ item_name: item.name, quantity: item.quantity, price: item.price })),
      })
      trackEvent('ads_conversion_Begin_checkout_1', { value: subtotal, currency: 'USD' })
      router.push('/checkout/payment')
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleSendQuote = async () => {
    const email = watch('email')
    if (!email) {
      toast.error('Please enter your email address above first')
      return
    }
    setSendingQuote(true)
    try {
      const firstName = watch('firstName')
      const lastName = watch('lastName')
      const res = await fetch('/api/send-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          customerName: (firstName || '') + ' ' + (lastName || ''),
          eventDate,
          eventTimeSlot,
          pickupTimeSlot,
          deliveryType: 'delivery',
          items,
          subtotal,
        }),
      })
      if (res.ok) {
        toast.success('Quote sent! Check your email.')
      } else {
        toast.error('Could not send quote. Please try again.')
      }
    } catch {
      toast.error('Could not send quote. Please try again.')
    } finally {
      setSendingQuote(false)
    }
  }


  const openScheduleEditor = () => {
    const parsedDate = eventDate ? new Date(eventDate) : null
    setEditDate(parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : null)
    setEditMethod('delivery')
    if (hasNewScheduling) {
      setEditEventStartTime(schedulingDetails.eventStartTime || '')
      setEditEventEndTime(schedulingDetails.eventEndTime || '')
      setEditWantsExactDelivery(!!schedulingDetails.exactDeliveryRequested)
      setEditExactDeliveryTime(schedulingDetails.exactDeliveryTime || '')
      if (schedulingDetails.deliveryWindowStart && schedulingDetails.deliveryWindowEnd) {
        const match = DELIVERY_WINDOWS.find((w) => w.start === schedulingDetails.deliveryWindowStart && w.end === schedulingDetails.deliveryWindowEnd)
        setEditDeliveryWindow(match || { start: schedulingDetails.deliveryWindowStart, end: schedulingDetails.deliveryWindowEnd, label: '' })
      } else {
        setEditDeliveryWindow(null)
      }
      setEditPickupType((schedulingDetails.pickupType as 'flexible' | 'requiredBy' | 'exact') || 'flexible')
      setEditPickupRequiredByTime(schedulingDetails.pickupRequiredByTime || '')
      setEditExactPickupTime(schedulingDetails.exactPickupTime || '')
    } else {
      setEditEventStartTime('')
      setEditEventEndTime('')
      setEditWantsExactDelivery(false)
      setEditExactDeliveryTime('')
      setEditDeliveryWindow(null)
      setEditPickupType('flexible')
      setEditPickupRequiredByTime('')
      setEditExactPickupTime('')
      setEditAppointmentSlot('')
      setEditAppointmentSpecificTime('')
    }
    setEditingSchedule(true)
  }

  const handleCancelSchedule = () => {
    setEditingSchedule(false)
  }

  const handleSaveSchedule = () => {
    if (!editDate) {
      toast.error('Please choose an event date')
      return
    }
    if (editMethod === 'delivery' && editWantsExactDelivery && (exactDeliveryFee === null || !editExactDeliveryTime)) {
      toast.error('Please choose an exact delivery time, or a delivery window')
      return
    }
    if (editMethod === 'delivery' && editPickupType === 'exact' && (editExactPickupFee === null || !editExactPickupTime)) {
      toast.error('Please choose an available exact pickup time, or a flexible pickup')
      return
    }
    setEventDate(formatDateShort(editDate))
    if (editMethod === 'delivery') {
      const deliveryLabel = editWantsExactDelivery ? 'Exact Time: ' + fmtT(editExactDeliveryTime) : (editDeliveryWindow?.label || '')
      let pickupLabel = ''
      if (editPickupType === 'flexible') {
        pickupLabel = 'Flexible Pickup (after event, based on our route)'
      } else if (editPickupType === 'requiredBy') {
        pickupLabel = 'Pickup Requested By: ' + fmtT(editPickupRequiredByTime)
      } else {
        pickupLabel = 'Exact Pickup Time: ' + fmtT(editExactPickupTime)
      }
      setEventTimeSlot(deliveryLabel)
      setPickupTimeSlot(pickupLabel)
      setExactTimeRequested(editWantsExactDelivery || editPickupType === 'exact')
      setDeliveryType('delivery')
      setSchedulingDetails({
        eventStartTime: editEventStartTime,
        eventEndTime: editEventEndTime,
        deliveryWindowStart: editWantsExactDelivery ? null : (editDeliveryWindow?.start || null),
        deliveryWindowEnd: editWantsExactDelivery ? null : (editDeliveryWindow?.end || null),
        exactDeliveryRequested: editWantsExactDelivery,
        exactDeliveryTime: editWantsExactDelivery ? editExactDeliveryTime : null,
        exactDeliveryFee: editWantsExactDelivery ? (exactDeliveryFee ?? 0) : 0,
        pickupType: editPickupType,
        pickupRequiredByTime: editPickupType === 'requiredBy' ? editPickupRequiredByTime : null,
        exactPickupTime: editPickupType === 'exact' ? editExactPickupTime : null,
        exactPickupFee: editPickupType === 'exact' ? (editExactPickupFee ?? 0) : 0,
        latePickupApprovalRequired: false,
      })
    } else {
      const label = APPOINTMENT_SLOTS.find((t) => t.value === editAppointmentSlot)?.label || ''
      const finalLabel = editAppointmentSlot === 'specific' && editAppointmentSpecificTime ? 'Specific Time: ' + editAppointmentSpecificTime : label
      setEventTimeSlot(finalLabel)
      setPickupTimeSlot(finalLabel)
      setExactTimeRequested(false)
      setDeliveryType('pickup')
      setSchedulingDetails(DEFAULT_SCHEDULING_DETAILS)
    }
    setEditingSchedule(false)
    toast.success('Schedule updated')
  }

  const editValidDeliveryWindows = getValidDeliveryWindows(editEventStartTime)
  const editRecommendedWindow = getRecommendedWindow(editEventStartTime)
  const editExactDeliveryTimeOptions = editEventStartTime
    ? EXACT_DELIVERY_TIME_OPTIONS_FULL.filter((opt) => timeToMinutes(opt.value) <= timeToMinutes(editEventStartTime))
    : EXACT_DELIVERY_TIME_OPTIONS_FULL
  const editCanSave = !!editDate && (editMethod === 'delivery'
    ? (
      !!editEventStartTime &&
      !!editEventEndTime &&
      (editWantsExactDelivery ? !!editExactDeliveryTime : !!editDeliveryWindow) &&
      (editPickupType === 'flexible' || (editPickupType === 'requiredBy' ? !!editPickupRequiredByTime : !!editExactPickupTime))
    )
    : (!!editAppointmentSlot && (editAppointmentSlot !== 'specific' || !!editAppointmentSpecificTime)))

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-dark mb-8">Checkout</h1>

      <div className="bg-gray-50 p-4 rounded-lg mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-dark">Order Summary</h2>
          {!editingSchedule && (
            <button type="button" onClick={openScheduleEditor} className="text-primary text-sm underline flex items-center gap-1">
              <Pencil size={14} />
              Edit Date/Time
            </button>
          )}
        </div>
        {!editingSchedule && (
          <>
        <p className="text-body text-sm mb-2">Event Date: {eventDate}</p>
        {hasNewScheduling ? (
          <>
            {(schedulingDetails.eventStartTime || schedulingDetails.eventEndTime) && (
              <p className="text-body text-sm mb-2">
                Event Time: {fmtT(schedulingDetails.eventStartTime)}{schedulingDetails.eventEndTime ? ' - ' + fmtT(schedulingDetails.eventEndTime) : ''}
              </p>
            )}
            {schedulingDetails.exactDeliveryRequested ? (
              <p className="text-body text-sm mb-2">Delivery: Exact Time {fmtT(schedulingDetails.exactDeliveryTime)} (+{formatCurrency(schedulingDetails.exactDeliveryFee || 0)})</p>
            ) : (schedulingDetails.deliveryWindowStart && (
              <p className="text-body text-sm mb-2">Delivery Window: {fmtT(schedulingDetails.deliveryWindowStart)} - {fmtT(schedulingDetails.deliveryWindowEnd)} (Standard, included)</p>
            ))}
            {schedulingDetails.pickupType === 'flexible' && (
              <p className="text-body text-sm mb-2">Pickup: Flexible (included, based on our route)</p>
            )}
            {schedulingDetails.pickupType === 'requiredBy' && (
              <p className="text-body text-sm mb-2">Pickup: Requested by {fmtT(schedulingDetails.pickupRequiredByTime)} (not guaranteed, no fee)</p>
            )}
            {schedulingDetails.pickupType === 'exact' && (
              <p className="text-body text-sm mb-2">Pickup: Exact Time {fmtT(schedulingDetails.exactPickupTime)} (+{formatCurrency(schedulingDetails.exactPickupFee || 0)})</p>
            )}
          </>
        ) : (
          <>
            {eventTimeSlot && (
              <p className="text-body text-sm mb-2">Time: {eventTimeSlot}</p>
            )}
            {isSingleDay ? (pickupTimeSlot && pickupTimeSlot !== eventTimeSlot && (
              <p className="text-body text-sm mb-2">Pickup/Return: {pickupTimeSlot}</p>
            )) : (<p className="text-body text-sm mb-2">Rental Length: {selectedTier?.label}{returnDateInfo ? ' - ' + returnDateInfo : ' - pickup/return timing for multi-day rentals will be confirmed with you.'}</p>)}
          </>
        )}
        </>
        )}

        {editingSchedule && (
          <div className="bg-white border border-primary/30 rounded-lg p-4 mb-2">
            <h3 className="font-bold text-dark mb-2 text-sm">Change Event Date</h3>
            <BookingCalendar
              selectedDate={editDate}
              onSelectDate={(d) => setEditDate(d)}
              closedDates={closedDates}
            />

            <div className="flex gap-3 mt-4 mb-4">
              <button
                type="button"
                onClick={() => setEditMethod('delivery')}
                className={`flex-1 rounded px-3 py-2 text-sm font-medium border ${editMethod === 'delivery' ? 'border-primary bg-primary/10 text-dark' : 'border-gray-200 text-body'}`}
              >
                Delivery to My Event
              </button>
                          </div>

            {editMethod === 'delivery' ? (
              <>
                <h3 className="font-bold text-dark mb-2 text-sm">Your Event</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Event starts</label>
                    <select
                      value={editEventStartTime}
                      onChange={(e) => setEditEventStartTime(e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Select time</option>
                      {EVENT_TIME_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Event ends</label>
                    <select
                      value={editEventEndTime}
                      onChange={(e) => setEditEventEndTime(e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Select time</option>
                      {EVENT_TIME_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <h3 className="font-bold text-dark mb-2 text-sm">Delivery Window</h3>
                {!editWantsExactDelivery && (
                  <div className="space-y-2 mb-3">
                    {editValidDeliveryWindows.map((w) => {
                      const isRecommended = !!editRecommendedWindow && w.start === editRecommendedWindow.start && w.end === editRecommendedWindow.end
                      const isSelected = !!editDeliveryWindow && editDeliveryWindow.start === w.start && editDeliveryWindow.end === w.end
                      return (
                        <label
                          key={w.start}
                          className={`flex items-start gap-2 border rounded p-3 cursor-pointer text-sm ${isSelected ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
                        >
                          <input
                            type="radio"
                            name="editDeliveryWindow"
                            className="mt-1"
                            checked={isSelected}
                            onChange={() => setEditDeliveryWindow(w)}
                          />
                          <span>
                            <span className="font-medium text-dark">{w.label}</span>
                            {isRecommended && (
                              <span className="ml-2 text-xs bg-secondary/20 text-dark px-2 py-0.5 rounded">Recommended</span>
                            )}
                          </span>
                        </label>
                      )
                    })}
                    {editValidDeliveryWindows.length === 0 && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                        Please set your event start time above to see available delivery windows.
                      </p>
                    )}
                  </div>
                )}

                {exactDeliveryFee !== null && <div className="mb-4 border-t pt-3">
                  <label className="flex items-start gap-2 text-sm text-body cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editWantsExactDelivery}
                      onChange={(e) => { setEditWantsExactDelivery(e.target.checked); setEditDeliveryWindow(null); setEditExactDeliveryTime('') }}
                      className="mt-1"
                    />
                    <span>
                      <span className="font-medium text-dark">Need us there at a specific time? Priority Exact-Time Delivery +{formatCurrency(exactDeliveryFee)}</span>
                    </span>
                  </label>
                  {editWantsExactDelivery && (
                    <select
                      value={editExactDeliveryTime}
                      onChange={(e) => setEditExactDeliveryTime(e.target.value)}
                      className="w-full border rounded px-3 py-2 mt-3"
                    >
                      <option value="">Select exact time</option>
                      {editExactDeliveryTimeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}
                </div>}

                <h3 className="font-bold text-dark mb-2 text-sm">Pickup</h3>
                <div className="space-y-2 mb-4">
                  <label className={`flex items-start gap-2 border rounded p-3 cursor-pointer text-sm ${editPickupType === 'flexible' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                    <input
                      type="radio"
                      name="editPickupType"
                      className="mt-1"
                      checked={editPickupType === 'flexible'}
                      onChange={() => setEditPickupType('flexible')}
                    />
                    <span>
                      <span className="font-medium text-dark">Flexible Pickup</span>
                      <span className="ml-2 text-xs text-green-700">Included</span>
                    </span>
                  </label>

                  <label className={`flex items-start gap-2 border rounded p-3 cursor-pointer text-sm ${editPickupType === 'requiredBy' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                    <input
                      type="radio"
                      name="editPickupType"
                      className="mt-1"
                      checked={editPickupType === 'requiredBy'}
                      onChange={() => setEditPickupType('requiredBy')}
                    />
                    <span>
                      <span className="font-medium text-dark">Pickup Requested By a Certain Time</span>
                      <span className="ml-2 text-xs text-green-700">Included</span>
                    </span>
                  </label>
                  {editPickupType === 'requiredBy' && (
                    <select
                      value={editPickupRequiredByTime}
                      onChange={(e) => setEditPickupRequiredByTime(e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Select a time</option>
                      {EXACT_PICKUP_TIME_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}

                  {exactPickupOffered && <label className={`flex items-start gap-2 border rounded p-3 cursor-pointer text-sm ${editPickupType === 'exact' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                    <input
                      type="radio"
                      name="editPickupType"
                      className="mt-1"
                      checked={editPickupType === 'exact'}
                      onChange={() => setEditPickupType('exact')}
                    />
                    <span>
                      <span className="font-medium text-dark">Guaranteed Exact Pickup Time</span>
                    </span>
                  </label>}
                  {exactPickupOffered && editPickupType === 'exact' && (
                    <>
                      <select
                        value={editExactPickupTime}
                        onChange={(e) => setEditExactPickupTime(e.target.value)}
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="">Select a time</option>
                        {editExactPickupTimeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      {editExactPickupTime && editExactPickupFee !== null && (
                        <p className="text-xs text-gray-600">Exact pickup fee: {formatCurrency(editExactPickupFee)}</p>
                      )}
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <h3 className="font-bold text-dark mb-2 text-sm">What time would you like to pick up your order?</h3>
                <div className="space-y-2 mb-4">
                  {APPOINTMENT_SLOTS.map((slot) => (
                    <label key={slot.value} className="flex items-center gap-2 text-sm text-body">
                      <input
                        type="radio"
                        name="editAppointmentSlot"
                        value={slot.value}
                        checked={editAppointmentSlot === slot.value}
                        onChange={() => setEditAppointmentSlot(slot.value)}
                      />
                      {slot.label}
                    </label>
                  ))}
                </div>
                {editAppointmentSlot === 'specific' && (
                  <select
                    value={editAppointmentSpecificTime}
                    onChange={(e) => setEditAppointmentSpecificTime(e.target.value)}
                    className="w-full border rounded px-3 py-2 mb-4"
                  >
                    <option value="">Select a time</option>
                    {APPOINTMENT_TIME_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                )}
              </>
            )}

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={handleSaveSchedule}
                disabled={!editCanSave}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={handleCancelSchedule}
                className="flex-1 border border-gray-300 rounded px-4 py-2 text-body"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm text-body py-1">
            <span>{item.name} x{item.quantity}</span>
            <span>{formatCurrency(item.price * item.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between text-dark mt-2 border-t pt-2">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {belowMinimum && (
          <p role="alert" className="mt-2 rounded bg-amber-50 p-2 text-sm text-amber-900">
            Online delivery orders have a {formatCurrency(minimumOrderSubtotal)} minimum in rentals before fees and tax.
            Add {formatCurrency(minimumOrderSubtotal - subtotal)} more, or call {BUSINESS.phone} to discuss your event.
          </p>
        )}
        {durationAmount > 0 && (
          <div className="flex justify-between text-body text-sm">
            <span>Multi-Day Rental Fee ({selectedTier?.label})</span>
            <span>{formatCurrency(durationAmount)}</span>
          </div>
        )}
        {hasNewScheduling ? (
          <>
            {schedulingDetails.exactDeliveryRequested && (
              <div className="flex justify-between text-body text-sm">
                <span>Exact-Time Delivery Fee</span>
                <span>{formatCurrency(schedulingDetails.exactDeliveryFee || 0)}</span>
              </div>
            )}
            {schedulingDetails.pickupType === 'exact' && (
              <div className="flex justify-between text-body text-sm">
                <span>Exact-Time Pickup Fee</span>
                <span>{formatCurrency(schedulingDetails.exactPickupFee || 0)}</span>
              </div>
            )}
          </>
        ) : (exactTimeRequested && exactTimeFee && (
          <div className="flex justify-between text-body text-sm">
            <span>{exactTimeFee.name} Delivery Fee</span>
            <span>{formatCurrency(exactTimeFee.amount)}</span>
          </div>
        ))}
        <p className="text-xs text-gray-500 mt-2">Delivery fee and sales tax are calculated on the next step based on your event address.</p>
      </div>

      {hasNewScheduling ? (
        schedulingFeeTotal > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-body mb-4">
            {formatCurrency(schedulingFeeTotal)} in guaranteed exact-time fees will be added to your total based on the timing you selected.
          </div>
        )
      ) : (exactTimeRequested && exactTimeFee && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-body mb-4">
          A {formatCurrency(exactTimeFee.amount)} Exact Time Delivery fee will be added to your total because you requested a guaranteed drop-off and pick-up time.
        </div>
      ))}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark mb-1">First Name *</label>
            <input {...register('firstName', { required: true })} className="w-full border rounded px-3 py-2" />
            {errors.firstName && <span className="text-red-500 text-xs">Required</span>}
          </div>
          <div>
            <label className="block text-sm font-medium text-dark mb-1">Last Name *</label>
            <input {...register('lastName', { required: true })} className="w-full border rounded px-3 py-2" />
            {errors.lastName && <span className="text-red-500 text-xs">Required</span>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-dark mb-1">Email *</label>
          <input type="email" {...register('email', { required: true })} className="w-full border rounded px-3 py-2" />
          {errors.email && <span className="text-red-500 text-xs">Required</span>}
        </div>
        <div>
          <label className="block text-sm font-medium text-dark mb-1">Phone</label>
          <input type="tel" {...register('phone')} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-dark mb-1">Event Address *</label>
          <input {...register('eventAddress', { required: true })} className="w-full border rounded px-3 py-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark mb-1">City {watch('deliveryType') !== 'pickup' ? '*' : ''}</label>
            <input {...register('eventCity', { required: watch('deliveryType') !== 'pickup' })} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark mb-1">State {watch('deliveryType') !== 'pickup' ? '*' : ''}</label>
            <input {...register('eventState', { required: watch('deliveryType') !== 'pickup' })} defaultValue="NY" className="w-full border rounded px-3 py-2" /></div>
          <div>
            <label className="block text-sm font-medium text-dark mb-1">Zip {watch('deliveryType') !== 'pickup' ? '*' : ''}</label>
            <input {...register('eventZip', { required: watch('deliveryType') !== 'pickup' })} className="w-full border rounded px-3 py-2" />
          </div>
        </div>
        {(hasTablesTentsItem || hasBounceItem) && (
          <div className="bg-gray-50 p-3 rounded space-y-3">
            {hasTentItem && (
              <>
                <p className="text-sm font-medium text-dark">Tent Setup Details</p>
                <div>
                  <label className="block text-sm font-medium text-dark mb-1">Surface Type</label>
                  <select {...register('tentSurfaceType')} className="w-full border rounded px-3 py-2">
                    <option value="">Select surface type</option>
                    <option value="grass">Grass</option>
                    <option value="concrete">Concrete / Pavement</option>
                    <option value="gravel">Gravel</option>
                    <option value="deck">Deck / Patio</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark mb-1">Tent Setup Area / Dimensions</label>
                  <input {...register('tentSurfaceArea')} placeholder="e.g. 20ft x 20ft" className="w-full border rounded px-3 py-2" />
                </div>
              </>
            )}
            {visibleFees.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-sm font-medium text-dark">Suggested Add-Ons</p>
                {visibleFees.map((fee) => (
                  <div key={fee.id} className="flex items-start gap-2">
                    <input type="checkbox" id={`fee-${fee.id}`} value={fee.id} {...register('specialRequests')} className="mt-1" />
                    <label htmlFor={`fee-${fee.id}`} className="text-sm text-body">
                      {fee.name} (+{formatCurrency(fee.amount)})
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-dark mb-1">Coupon Code</label>
          <input {...register('couponCode')} placeholder="Optional" className="w-full border rounded px-3 py-2" />
        </div>
        {damageWaiverPercent !== null && <div className="flex items-start gap-2 bg-gray-50 p-3 rounded">
          <input type="checkbox" id="damageWaiver" {...register('damageWaiver')} className="mt-1" />
          <label htmlFor="damageWaiver" className="text-sm text-body">
            <span className="font-medium text-dark">Add Damage Waiver ({formatTaxRatePercent(damageWaiverPercent)} of rental subtotal)</span> - covers accidental damage to rental equipment during your event, excluding intentional damage or theft.
          </label>
        </div>}
        <div>
          <label className="block text-sm font-medium text-dark mb-1">Notes</label>
          <textarea {...register('notes')} rows={3} className="w-full border rounded px-3 py-2" />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Processing...' : 'Continue to Payment'}
        </button>
        <button type="button" onClick={handleSendQuote} disabled={sendingQuote} className="w-full border border-blue-600 text-blue-600 rounded py-2 font-medium hover:bg-blue-50">
          {sendingQuote ? 'Sending...' : 'Email Me This Quote'}
        </button>
      </form>
    </div>
  )
}
