'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, notFound } from 'next/navigation'
import ItemCard from '@/components/public/ItemCard'
import BookingCalendar from '@/components/public/BookingCalendar'
import CartDrawer from '@/components/public/CartDrawer'
import { useCart, DEFAULT_SCHEDULING_DETAILS } from '@/components/public/CartContext'
import { formatDateShort } from '@/lib/utils'
import { ShoppingCart, CalendarDays, Pencil, Truck, MapPin } from 'lucide-react'

const APPOINTMENT_SLOTS = [
  { value: 'morning', label: 'Morning (9am - 12pm)' },
  { value: 'afternoon', label: 'Afternoon (12pm - 4pm)' },
  { value: 'evening', label: 'Evening (4pm - 6pm)' },
  { value: 'specific', label: 'Specific Time' },
]

const APPOINTMENT_TIME_OPTIONS: { value: string; label: string }[] = (() => {
  const options: { value: string; label: string }[] = []
  for (let mins = 9 * 60; mins <= 17 * 60; mins += 30) {
    const h24 = Math.floor(mins / 60)
    const m = mins % 60
    const period = h24 >= 12 ? 'PM' : 'AM'
    let h12 = h24 % 12
    if (h12 === 0) h12 = 12
    const value = String(h24).padStart(2, '0') + ':' + String(m).padStart(2, '0')
    const label = h12 + ':' + String(m).padStart(2, '0') + ' ' + period
    options.push({ value, label })
  }
  return options
})()

const EXACT_DELIVERY_FEE = 50
const DEFAULT_SETUP_BUFFER_MINUTES = 120

const DELIVERY_WINDOWS: { start: string; end: string; label: string }[] = [
  { start: '08:00', end: '10:00', label: '8:00 AM - 10:00 AM' },
  { start: '10:00', end: '12:00', label: '10:00 AM - 12:00 PM' },
  { start: '12:00', end: '14:00', label: '12:00 PM - 2:00 PM' },
  { start: '14:00', end: '16:00', label: '2:00 PM - 4:00 PM' },
  { start: '16:00', end: '18:00', label: '4:00 PM - 6:00 PM' },
]

function timeToMinutes(t: string): number {
  if (!t) return -1
  const parts = t.split(':')
  const h = Number(parts[0])
  const m = Number(parts[1])
  if (isNaN(h) || isNaN(m)) return -1
  return h * 60 + m
}

function formatTime12h(t: string): string {
  if (!t) return ''
  const parts = t.split(':')
  const h24 = Number(parts[0])
  const m = Number(parts[1])
  const period = h24 >= 12 ? 'PM' : 'AM'
  let h12 = h24 % 12
  if (h12 === 0) h12 = 12
  return h12 + ':' + String(m).padStart(2, '0') + ' ' + period
}

function buildTimeOptions(startMins: number, endMins: number): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = []
  for (let mins = startMins; mins <= endMins; mins += 30) {
    const h24 = Math.floor(mins / 60)
    const m = mins % 60
    const value = String(h24).padStart(2, '0') + ':' + String(m).padStart(2, '0')
    options.push({ value, label: formatTime12h(value) })
  }
  return options
}

const EVENT_TIME_OPTIONS = buildTimeOptions(7 * 60, 23 * 60 + 30)
const EXACT_DELIVERY_TIME_OPTIONS_FULL = buildTimeOptions(8 * 60, 18 * 60)
const EXACT_PICKUP_TIME_OPTIONS = buildTimeOptions(12 * 60, 23 * 60 + 30)

function getExactPickupFee(time: string): number {
  const mins = timeToMinutes(time)
  if (mins < 0) return 50
  if (mins < 22 * 60) return 50
  return 75
}

function getValidDeliveryWindows(eventStartTime: string): { start: string; end: string; label: string }[] {
  const eventMins = timeToMinutes(eventStartTime)
  if (eventMins < 0) return DELIVERY_WINDOWS
  return DELIVERY_WINDOWS.filter((w) => timeToMinutes(w.end) <= eventMins)
}

function getRecommendedWindow(eventStartTime: string): { start: string; end: string; label: string } | null {
  const valid = getValidDeliveryWindows(eventStartTime)
  if (valid.length === 0) return null
  const eventMins = timeToMinutes(eventStartTime)
  if (eventMins < 0) return valid[valid.length - 1]
  const withBuffer = valid.filter((w) => eventMins - timeToMinutes(w.end) >= DEFAULT_SETUP_BUFFER_MINUTES)
  if (withBuffer.length > 0) return withBuffer[withBuffer.length - 1]
  return valid[valid.length - 1]
}

export default function CategoryClient({ slug, initialCategory, initialItems }: { slug: string; initialCategory: { name: string; description?: string; bookableAfter?: string | null; bookableAfterMessage?: string | null } | null; initialItems: Array<{ id: string; slug?: string | null; name: string; cost: number; picture?: string | null; available: number; category?: { pricingProfile?: string | null } | null; bookableAfter?: string | null; bookableAfterMessage?: string | null; description?: string | null; colorOptions?: string[]; updatedAt?: string | null }> }) {
  const searchParams = useSearchParams()
  const dateParam = searchParams.get('date')
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    dateParam ? new Date(dateParam) : null
  )
  const [category, setCategory] = useState<{ name: string; description?: string; bookableAfter?: string | null; bookableAfterMessage?: string | null } | null>(initialCategory)
  const [notFoundTriggered, setNotFoundTriggered] = useState(false)
  const [showTentGuide, setShowTentGuide] = useState(false)
  const dismissTentGuide = () => {
    setShowTentGuide(false)
    if (typeof window !== 'undefined') {
      localStorage.setItem('fpr_tentGuideDismissed', 'true')
    }
  }
  const [items, setItems] = useState<Array<{
    id: string
    slug?: string | null
    name: string
    cost: number
    picture?: string | null
    available: number
    category?: { pricingProfile?: string | null } | null
    bookableAfter?: string | null
    bookableAfterMessage?: string | null
    description?: string | null
    colorOptions?: string[]
    updatedAt?: string | null
  }>>(initialItems)
  const [cartOpen, setCartOpen] = useState(false)
  const [closedDates, setClosedDates] = useState<string[]>([])
  const { setEventDate, setEventTimeSlot, eventTimeSlot, setDeliveryType, setPickupTimeSlot, setExactTimeRequested, setSchedulingDetails, itemCount, durationTierId, setDurationTierId } = useCart()

  const [browseWithoutDate, setBrowseWithoutDate] = useState(false)
  const [bookingMethod, setBookingMethod] = useState<'' | 'delivery' | 'pickup'>('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedMethod = localStorage.getItem('fpr_bookingMethod')
    const savedSkip = localStorage.getItem('fpr_browseWithoutDate')
    if (savedMethod === 'delivery' || savedMethod === 'pickup') {
      setBookingMethod(savedMethod)
    } else if (savedSkip === 'true') {
      setBrowseWithoutDate(true)
    }
  }, [])
  const [timeConfirmed, setTimeConfirmed] = useState(false)
  const [eventStartTime, setEventStartTimeLocal] = useState('')
  const [eventEndTime, setEventEndTimeLocal] = useState('')
  const [deliveryWindow, setDeliveryWindow] = useState<{ start: string; end: string; label: string } | null>(null)
  const [wantsExactDelivery, setWantsExactDelivery] = useState(false)
  const [exactDeliveryTime, setExactDeliveryTime] = useState('')
  const [pickupType, setPickupTypeLocal] = useState<'flexible' | 'requiredBy' | 'exact'>('flexible')
  const [pickupRequiredByTime, setPickupRequiredByTime] = useState('')
  const [exactPickupTime, setExactPickupTime] = useState('')
  const [appointmentSlot, setAppointmentSlot] = useState('')
  const [appointmentSpecificTime, setAppointmentSpecificTime] = useState('')
  const [tiers, setTiers] = useState<{ id: string; label: string; percent: number }[]>([])
  const [showRentalLength, setShowRentalLength] = useState(false)

  useEffect(() => {
    fetch('/api/categories/' + slug)
      .then((r) => {
        if (r.status === 404) {
          setNotFoundTriggered(true)
          return null
        }
        return r.json()
      })
      .then((data) => {
        if (!data || !data.category) {
          setNotFoundTriggered(true)
          return
        }
        setCategory(data.category)
      })
      .catch(() => {})
  }, [slug])

  useEffect(() => {
    if (slug === 'tent-rentals' && (typeof window === 'undefined' || localStorage.getItem('fpr_tentGuideDismissed') !== 'true')) {
      setShowTentGuide(true)
    }
  }, [slug])

  useEffect(() => {
    fetch('/api/closed-dates')
      .then((r) => r.json())
      .then((data) => setClosedDates(data.dates || []))
      .catch(() => setClosedDates([]))
  }, [])

  useEffect(() => {
    fetch('/api/pricing-tiers')
      .then((r) => r.json())
      .then((data) => {
        const list = data.tiers || []
        setTiers(list)
        if (list.length > 0 && !durationTierId) {
          setDurationTierId(list[0].id)
        }
      })
      .catch(() => setTiers([]))
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    if (selectedDate) {
      const dateStr = formatDateShort(selectedDate)
      setEventDate(dateStr)
      fetch('/api/items?date=' + dateStr + '&category=' + slug, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => setItems(data.items || []))
        .catch((err) => { if (err.name !== 'AbortError') setItems([]) })
    } else {
      fetch('/api/items?category=' + slug, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) =>
          setItems(
            (data.items || []).map((item: any) => ({
              ...item,
              available: item.quantity,
            }))
          )
        )
        .catch((err) => { if (err.name !== 'AbortError') setItems([]) })
    }
    return () => controller.abort()
  }, [selectedDate, slug, setEventDate])

  useEffect(() => {
    if (bookingMethod !== 'delivery') return
    if (wantsExactDelivery) return
    if (!eventStartTime) return
    const valid = getValidDeliveryWindows(eventStartTime)
    setDeliveryWindow((prev) => {
      if (prev && valid.some((w) => w.start === prev.start && w.end === prev.end)) return prev
      return getRecommendedWindow(eventStartTime)
    })
  }, [eventStartTime, wantsExactDelivery, bookingMethod])

  const isBookingBlocked = Boolean(
    category?.bookableAfter && new Date() < new Date(category.bookableAfter)
  )

  const handleSelectMethod = (method: 'delivery' | 'pickup') => {
    setBookingMethod(method); if (typeof window !== 'undefined') localStorage.setItem('fpr_bookingMethod', method)
  }

  const resetTimeSelections = () => {
    setEventStartTimeLocal('')
    setEventEndTimeLocal('')
    setDeliveryWindow(null)
    setWantsExactDelivery(false)
    setExactDeliveryTime('')
    setPickupTypeLocal('flexible')
    setPickupRequiredByTime('')
    setExactPickupTime('')
    setAppointmentSlot('')
    setAppointmentSpecificTime('')
  }

  const handleChangeMethod = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fpr_bookingMethod')
      localStorage.removeItem('fpr_browseWithoutDate')
    }
    setBookingMethod('')
    setSelectedDate(null)
    setTimeConfirmed(false)
    resetTimeSelections()
  }

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date)
    setTimeConfirmed(false)
    resetTimeSelections()
  }

  const handleConfirmTime = () => {
    setDeliveryType(bookingMethod || null)
    if (bookingMethod === 'delivery') {
      const deliveryLabel = wantsExactDelivery
        ? 'Exact Time: ' + formatTime12h(exactDeliveryTime)
        : (deliveryWindow?.label || '')

      let pickupLabel = ''
      if (pickupType === 'flexible') {
        pickupLabel = 'Flexible Pickup (after event, based on our route)'
      } else if (pickupType === 'requiredBy') {
        pickupLabel = 'Pickup Requested By: ' + formatTime12h(pickupRequiredByTime)
      } else {
        pickupLabel = 'Exact Pickup Time: ' + formatTime12h(exactPickupTime)
      }

      setEventTimeSlot(deliveryLabel)
      setPickupTimeSlot(pickupLabel)
      setExactTimeRequested(wantsExactDelivery || pickupType === 'exact')

      setSchedulingDetails({
        eventStartTime,
        eventEndTime,
        deliveryWindowStart: wantsExactDelivery ? null : (deliveryWindow?.start || null),
        deliveryWindowEnd: wantsExactDelivery ? null : (deliveryWindow?.end || null),
        exactDeliveryRequested: wantsExactDelivery,
        exactDeliveryTime: wantsExactDelivery ? exactDeliveryTime : null,
        exactDeliveryFee: wantsExactDelivery ? EXACT_DELIVERY_FEE : 0,
        pickupType,
        pickupRequiredByTime: pickupType === 'requiredBy' ? pickupRequiredByTime : null,
        exactPickupTime: pickupType === 'exact' ? exactPickupTime : null,
        exactPickupFee: pickupType === 'exact' ? getExactPickupFee(exactPickupTime) : 0,
        latePickupApprovalRequired: false,
      })
    } else {
      const label = APPOINTMENT_SLOTS.find((t) => t.value === appointmentSlot)?.label || ''
      const finalLabel = appointmentSlot === 'specific' && appointmentSpecificTime
        ? 'Specific Time: ' + appointmentSpecificTime
        : label
      setEventTimeSlot(finalLabel)
      setPickupTimeSlot(finalLabel)
      setExactTimeRequested(false)
      setSchedulingDetails(DEFAULT_SCHEDULING_DETAILS)
    }
    setTimeConfirmed(true)
  }

  const handleChangeDate = () => {
    setSelectedDate(null)
    setTimeConfirmed(false)
    resetTimeSelections()
  }

  const handleToggleExactDelivery = (checked: boolean) => {
    setWantsExactDelivery(checked)
    setDeliveryWindow(null)
    setExactDeliveryTime('')
  }

  const showMethodPicker = !isBookingBlocked && !bookingMethod && !browseWithoutDate
  const showCalendar = !isBookingBlocked && !!bookingMethod && !selectedDate && !browseWithoutDate
  const showTimePicker = !isBookingBlocked && !!bookingMethod && !!selectedDate && !timeConfirmed
  const showItems = isBookingBlocked || browseWithoutDate || (!!selectedDate && timeConfirmed)
  const isPickupOrder = bookingMethod === 'pickup'

  const canContinue = bookingMethod === 'delivery'
    ? (
        !!eventStartTime &&
        !!eventEndTime &&
        (wantsExactDelivery ? !!exactDeliveryTime : !!deliveryWindow) &&
        (pickupType === 'flexible' || (pickupType === 'requiredBy' ? !!pickupRequiredByTime : !!exactPickupTime))
      )
    : !!appointmentSlot && (appointmentSlot !== 'specific' || !!appointmentSpecificTime)

  const validDeliveryWindows = getValidDeliveryWindows(eventStartTime)
  const recommendedWindow = getRecommendedWindow(eventStartTime)
  const exactDeliveryTimeOptions = eventStartTime
    ? EXACT_DELIVERY_TIME_OPTIONS_FULL.filter((opt) => timeToMinutes(opt.value) <= timeToMinutes(eventStartTime))
    : EXACT_DELIVERY_TIME_OPTIONS_FULL

  if (notFoundTriggered) {
    notFound()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {slug === 'tent-rentals' && showTentGuide && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => dismissTentGuide()}>
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 relative shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => dismissTentGuide()} className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            <h2 className="text-xl font-bold text-dark mb-1">Pole Tent vs. Frame Tent</h2>
            <p className="text-sm text-gray-600 mb-4">Not sure which tent is right for your event? Here is the difference.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <img src="/api/item-image/20x20-pole-tent" alt="Pole tent staked on grass" className="w-full h-40 object-cover rounded mb-2" />
                <h3 className="font-bold text-dark mb-1">Pole Tents</h3>
                <ul className="text-sm text-gray-700 list-disc pl-4 space-y-1">
                  <li>Secured to the ground with stakes and ropes</li>
                  <li>Best for grass and soft ground surfaces</li>
                </ul>
              </div>
              <div>
                <img src="/api/item-image/20-x-20-frame-tent" alt="Frame tent on pavement" className="w-full h-40 object-cover rounded mb-2" />
                <h3 className="font-bold text-dark mb-1">Frame Tents</h3>
                <ul className="text-sm text-gray-700 list-disc pl-4 space-y-1">
                  <li>Weighted down with water barrels or concrete blocks (no stakes)</li>
                  <li>Best for concrete, driveways and patios</li>
                </ul>
              </div>
            </div>
            <button onClick={() => dismissTentGuide()} className="btn-primary w-full mt-5">Got it, thanks</button>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark">{category?.name || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</h1>
        </div>
        <button onClick={() => setCartOpen(true)} className="btn-primary flex items-center gap-2">
          <ShoppingCart size={20} />
          Cart ({itemCount})
        </button>
      </div>

      {isBookingBlocked ? (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-6 text-center">
          <p className="text-dark font-semibold">
            {category?.bookableAfterMessage ||
              `Bookings for this category open on ${new Date(category!.bookableAfter as string).toLocaleDateString()}. Contact us to reserve your date in advance.`}
          </p>
        </div>
      ) : (
        <>
          {showMethodPicker && (
            <div className="mb-8 bg-white border border-primary/50 rounded-lg p-6 max-w-md mx-auto text-center">
              <h2 className="font-bold text-dark mb-4">How would you like your rental?</h2>
              <div className="space-y-3">
                <button
                  onClick={() => handleSelectMethod('delivery')}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <Truck size={18} />
                  Delivery to My Event
                </button>
                <button
                  onClick={() => handleSelectMethod('pickup')}
                  className="w-full border border-primary text-primary rounded px-4 py-2 flex items-center justify-center gap-2 font-medium"
                >
                  <MapPin size={18} />
                  I'll Pick Up (By Appointment)
                </button>
              </div>
              <div className="text-center mt-4">
                <button
                  onClick={() => { setBrowseWithoutDate(true); if (typeof window !== 'undefined') localStorage.setItem('fpr_browseWithoutDate', 'true') }}
                  className="text-primary text-sm underline"
                >
                  Skip for now, browse all items without a date
                </button>
              </div>
            </div>
          )}

          {showCalendar && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-dark">Select Event Date</h2>
                <button onClick={handleChangeMethod} className="text-primary text-sm underline">
                  Change
                </button>
              </div>
              <p className="text-body text-sm mb-4">Pick a date to check live availability for this category.</p>
              <BookingCalendar
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
                closedDates={closedDates}
              />
              <div className="text-center mt-4">
                <button
                  onClick={() => { setBrowseWithoutDate(true); if (typeof window !== 'undefined') localStorage.setItem('fpr_browseWithoutDate', 'true') }}
                  className="text-primary text-sm underline"
                >
                  Skip for now, browse all items without a date
                </button>
              </div>
            </div>
          )}

          {showTimePicker && (
            <div className="mb-8 bg-white border border-primary/50 rounded-lg p-6 max-w-md mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-dark font-semibold">
                  <CalendarDays size={18} />
                  {selectedDate ? formatDateShort(selectedDate) : ''}
                </div>
                <button onClick={handleChangeDate} className="text-primary text-sm underline">
                  Change date
                </button>
              </div>

              {bookingMethod === 'delivery' ? (
                <>
                  <h2 className="font-bold text-dark mb-3">Your Event</h2>
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Event starts</label>
                      <select
                        value={eventStartTime}
                        onChange={(e) => setEventStartTimeLocal(e.target.value)}
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
                        value={eventEndTime}
                        onChange={(e) => setEventEndTimeLocal(e.target.value)}
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="">Select time</option>
                        {EVENT_TIME_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <h2 className="font-bold text-dark mb-3">Choose Your Delivery Window</h2>
                  {!wantsExactDelivery && (
                    <div className="space-y-2 mb-3">
                      {validDeliveryWindows.map((w) => {
                        const isRecommended = !!recommendedWindow && w.start === recommendedWindow.start && w.end === recommendedWindow.end
                        const isSelected = !!deliveryWindow && deliveryWindow.start === w.start && deliveryWindow.end === w.end
                        return (
                          <label
                            key={w.start}
                            className={`flex items-start gap-2 border rounded p-3 cursor-pointer text-sm ${isSelected ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
                          >
                            <input
                              type="radio"
                              name="deliveryWindow"
                              className="mt-1"
                              checked={isSelected}
                              onChange={() => setDeliveryWindow(w)}
                            />
                            <span>
                              <span className="font-medium text-dark">{w.label}</span>
                              {isRecommended && (
                                <span className="ml-2 text-xs bg-secondary/20 text-dark px-2 py-0.5 rounded">Recommended</span>
                              )}
                              <br />
                              <span className="text-xs text-gray-500">Standard Delivery &bull; Included &mdash; we'll arrive anytime during this 2-hour window.</span>
                            </span>
                          </label>
                        )
                      })}
                      {validDeliveryWindows.length === 0 && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                          Please set your event start time above to see available delivery windows.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mb-4 border-t pt-3">
                    <label className="flex items-start gap-2 text-sm text-body cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wantsExactDelivery}
                        onChange={(e) => handleToggleExactDelivery(e.target.checked)}
                        className="mt-1"
                      />
                      <span>
                        <span className="font-medium text-dark">Need us there at a specific time? Priority Exact-Time Delivery +${EXACT_DELIVERY_FEE}</span>
                        <br />
                        <span className="text-xs text-gray-500">Choose this option only if your venue or event requires our crew to arrive at a specific time.</span>
                      </span>
                    </label>
                    {wantsExactDelivery && (
                      <select
                        value={exactDeliveryTime}
                        onChange={(e) => setExactDeliveryTime(e.target.value)}
                        className="w-full border rounded px-3 py-2 mt-3"
                      >
                        <option value="">Select exact time</option>
                        {exactDeliveryTimeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <h2 className="font-bold text-dark mb-3">Choose Your Pickup</h2>
                  <div className="space-y-2 mb-4">
                    <label className={`flex items-start gap-2 border rounded p-3 cursor-pointer text-sm ${pickupType === 'flexible' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                      <input
                        type="radio"
                        name="pickupType"
                        className="mt-1"
                        checked={pickupType === 'flexible'}
                        onChange={() => setPickupTypeLocal('flexible')}
                      />
                      <span>
                        <span className="font-medium text-dark">Flexible Pickup</span>
                        <span className="ml-2 text-xs bg-secondary/20 text-dark px-2 py-0.5 rounded">Recommended</span>
                        <span className="ml-2 text-xs text-green-700">Included</span>
                        <br />
                        <span className="text-xs text-gray-500">We'll pick up after your event based on our route. You don't need to choose an exact pickup time.</span>
                      </span>
                    </label>

                    <label className={`flex items-start gap-2 border rounded p-3 cursor-pointer text-sm ${pickupType === 'requiredBy' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                      <input
                        type="radio"
                        name="pickupType"
                        className="mt-1"
                        checked={pickupType === 'requiredBy'}
                        onChange={() => setPickupTypeLocal('requiredBy')}
                      />
                      <span>
                        <span className="font-medium text-dark">Pickup Requested By a Certain Time</span>
                        <span className="ml-2 text-xs text-green-700">Included</span>
                        <br />
                        <span className="text-xs text-gray-500">Let us know a time you'd like it picked up by. We'll do our best, but this is not a guaranteed exact time and carries no fee.</span>
                      </span>
                    </label>
                    {pickupType === 'requiredBy' && (
                      <select
                        value={pickupRequiredByTime}
                        onChange={(e) => setPickupRequiredByTime(e.target.value)}
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="">Select a time</option>
                        {EXACT_PICKUP_TIME_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    )}

                    <label className={`flex items-start gap-2 border rounded p-3 cursor-pointer text-sm ${pickupType === 'exact' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                      <input
                        type="radio"
                        name="pickupType"
                        className="mt-1"
                        checked={pickupType === 'exact'}
                        onChange={() => setPickupTypeLocal('exact')}
                      />
                      <span>
                        <span className="font-medium text-dark">Guaranteed Exact Pickup Time</span>
                        <br />
                        <span className="text-xs text-gray-500">We'll pick up at the exact time you choose. Fee is $50 for times before 10pm, $75 for times between 10pm and 11:30pm.</span>
                      </span>
                    </label>
                    {pickupType === 'exact' && (
                      <>
                        <select
                          value={exactPickupTime}
                          onChange={(e) => setExactPickupTime(e.target.value)}
                          className="w-full border rounded px-3 py-2"
                        >
                          <option value="">Select a time</option>
                          {EXACT_PICKUP_TIME_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        {exactPickupTime && (
                          <p className="text-xs text-gray-600">Exact pickup fee: ${getExactPickupFee(exactPickupTime)}</p>
                        )}
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-500 mb-3">Pickup location: Greenville, SC (exact address provided after booking)</p>
                  <h2 className="font-bold text-dark mb-3">What time would you like to pick up your order?</h2>
                  <div className="space-y-2 mb-4">
                    {APPOINTMENT_SLOTS.map((slot) => (
                      <label key={slot.value} className="flex items-center gap-2 text-sm text-body">
                        <input
                          type="radio"
                          name="appointmentSlot"
                          value={slot.value}
                          checked={appointmentSlot === slot.value}
                          onChange={() => setAppointmentSlot(slot.value)}
                        />
                        {slot.label}
                      </label>
                    ))}
                  </div>
                  {appointmentSlot === 'specific' && (
                    <select
                      value={appointmentSpecificTime}
                      onChange={(e) => setAppointmentSpecificTime(e.target.value)}
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
              {tiers.length > 0 && (
                <div className="mb-4">
                  {!showRentalLength ? (
                    <button
                      type="button"
                      onClick={() => setShowRentalLength(true)}
                      className="text-sm text-primary underline"
                    >
                      Renting for more than one day?
                    </button>
                  ) : (
                    <>
                      <label className="block text-sm font-medium text-dark mb-1">Rental Length</label>
                      <select
                        value={durationTierId || ''}
                        onChange={(e) => setDurationTierId(e.target.value || null)}
                        className="w-full border rounded px-3 py-2"
                      >
                        {tiers.map((tier) => (
                          <option key={tier.id} value={tier.id}>
                            {tier.label}{tier.percent > 0 ? ' (+' + tier.percent + '%)' : ''}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              )}


              <button
                onClick={handleConfirmTime}
                disabled={!canContinue}
                className="btn-primary w-full disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          )}

          {showItems && (
            <>
              {(selectedDate || eventTimeSlot) && !browseWithoutDate && (
                <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6">
                  <div className="flex items-center gap-2 text-sm text-dark">
                    <CalendarDays size={16} />
                    {selectedDate ? formatDateShort(selectedDate) : ''}
                    {eventTimeSlot ? ` • ${eventTimeSlot}` : ''}
                    {isPickupOrder ? ' • Customer Pickup' : ''}
                  </div>
                  <button onClick={handleChangeMethod} className="text-primary text-sm underline flex items-center gap-1">
                    <Pencil size={14} />
                    Change
                  </button>
                </div>
              )}
              {browseWithoutDate && !selectedDate && (
                <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6">
                  <p className="text-sm text-body">Browsing without a date selected.</p>
                  <button onClick={() => setBrowseWithoutDate(false)} className="text-primary text-sm underline">
                    Pick a date
                  </button>
                </div>
              )}
              {items.length === 0 ? (
                <p className="text-body col-span-full text-center py-8">
                  {selectedDate ? 'No items available for this date.' : 'No items found in this category.'}
                </p>
              ) : slug === 'weddings' ? (
                <>
                  {items.some((item) => item.name.toLowerCase().includes('package')) && (
                    <div className="mb-10">
                      <h2 className="text-lg font-bold text-dark mb-4 pb-2 border-b-2 border-secondary">Wedding Packages</h2>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {items.filter((item) => item.name.toLowerCase().includes('package')).map((item, index) => (
                          <ItemCard
                            key={item.id}
                            priority={index < 4}
                            id={item.id}
                            slug={item.slug}
                            name={item.name}
                            cost={item.cost}
                            picture={item.picture}
                            updatedAt={item.updatedAt}
                            available={item.available}
                            pricingProfile={item.category?.pricingProfile || undefined}
                            hideAvailability={true}
                            isPackage={true}
                            bookableAfter={item.bookableAfter}
                            bookableAfterMessage={item.bookableAfterMessage}
                            description={item.description} colorOptions={item.colorOptions}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {items.some((item) => !item.name.toLowerCase().includes('package')) && (
                    <div>
                      <h2 className="text-lg font-bold text-dark mb-4 pb-2 border-b-2 border-gray-200">Wedding Décor & Accessories</h2>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {items.filter((item) => !item.name.toLowerCase().includes('package')).map((item, index) => (
                          <ItemCard
                            key={item.id}
                            priority={index < 4}
                            id={item.id}
                            slug={item.slug}
                            name={item.name}
                            cost={item.cost}
                            picture={item.picture}
                            updatedAt={item.updatedAt}
                            available={item.available}
                            pricingProfile={item.category?.pricingProfile || undefined}
                            hideAvailability={true}
                            isPackage={false}
                            bookableAfter={item.bookableAfter}
                            bookableAfterMessage={item.bookableAfterMessage}
                            description={item.description} colorOptions={item.colorOptions}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {items.map((item, index) => (
                    <ItemCard
                      key={item.id}
                      priority={index < 4}
                      id={item.id}
                      slug={item.slug}
                      name={item.name}
                      cost={item.cost}
                      picture={item.picture}
                      updatedAt={item.updatedAt}
                      available={item.available}
                      pricingProfile={item.category?.pricingProfile || undefined}
                      hideAvailability={true}
                      isPackage={item.name.toLowerCase().includes('package')}
                      bookableAfter={item.bookableAfter}
                      bookableAfterMessage={item.bookableAfterMessage}
                      description={item.description} colorOptions={item.colorOptions}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      <section className="mt-12 border-t pt-8 text-body">
        <h2 className="text-xl font-bold text-dark mb-3">
          {category?.name || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} Delivered Throughout Greenville, SC
        </h2>
        <p className="mb-3">
          Friendly Party Rental proudly supplies {(category?.name || 'rentals').toLowerCase()} for birthdays, graduations,
          weddings, corporate events, and backyard parties across Greenville, SC and the surrounding Upstate South Carolina
          communities. Whether you are planning a small backyard gathering or a large wedding reception, our team
          delivers, sets up, and picks up your rental so you can focus on your event.
        </p>
        <p>
          We regularly deliver to Greenville, Greer, Simpsonville, Mauldin, Easley, Travelers Rest, Spartanburg, Anderson, and
          Piedmont, SC. Don&apos;t see your town listed? Give us a call at (315) 884-1498 &mdash; we may still be able
          to deliver to you.
        </p>
      </section>
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  )
}
