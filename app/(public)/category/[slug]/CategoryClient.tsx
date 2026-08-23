'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, notFound } from 'next/navigation'
import ItemCard from '@/components/public/ItemCard'
import BookingCalendar from '@/components/public/BookingCalendar'
import CartDrawer from '@/components/public/CartDrawer'
import { useCart } from '@/components/public/CartContext'
import { formatDateShort } from '@/lib/utils'
import { ShoppingCart, CalendarDays, Pencil, Truck, MapPin } from 'lucide-react'

const TIME_SLOTS = [
  { value: 'morning', label: 'Morning (8am - 12pm)' },
  { value: 'afternoon', label: 'Afternoon (12pm - 7pm)' },
  { value: 'evening', label: 'Evening Drop-off (4pm - 8pm)' },
  { value: 'overnight', label: 'Overnight Rental (picked up the next day)' },
  { value: 'specific', label: 'Specific Time' },
]

const FREE_DROPOFF_SLOTS = [
  { value: 'morning', label: 'Morning (8am - 12pm)' },
  { value: 'afternoon', label: 'Afternoon (12pm - 7pm)' },
]

const RETURN_TIME_SLOTS = [
  { value: 'same_evening', label: 'Same Day Evening Pickup' },
  { value: 'next_morning', label: 'Next Day Morning Pickup' },
  { value: 'next_afternoon', label: 'Next Day Afternoon Pickup' },
  { value: 'specific', label: 'Specific Time' },
]

const FREE_RETURN_SLOTS = RETURN_TIME_SLOTS.filter((slot) => slot.value !== 'specific')

const APPOINTMENT_SLOTS = [
  { value: 'morning', label: 'Morning (9am - 12pm)' },
  { value: 'afternoon', label: 'Afternoon (12pm - 4pm)' },
  { value: 'evening', label: 'Evening (4pm - 6pm)' },
  { value: 'specific', label: 'Specific Time' },
]

const EXACT_TIME_FEE_AMOUNT = 100

const EXACT_TIME_OPTIONS: { value: string; label: string }[] = (() => {
  const options: { value: string; label: string }[] = []
  for (let mins = 9 * 60; mins <= 20 * 60; mins += 30) {
    const h24 = Math.floor(mins / 60)
    const m = mins % 60
    const period = h24 >= 12 ? 'PM' : 'AM'
    let h12 = h24 % 12
    if (h12 === 0) h12 = 12
    const value = `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    const label = `${h12}:${String(m).padStart(2, '0')} ${period}`
    options.push({ value, label })
  }
  return options
})()

const APPOINTMENT_TIME_OPTIONS: { value: string; label: string }[] = (() => {
  const options: { value: string; label: string }[] = []
  for (let mins = 9 * 60; mins <= 17 * 60; mins += 30) {
    const h24 = Math.floor(mins / 60)
    const m = mins % 60
    const period = h24 >= 12 ? 'PM' : 'AM'
    let h12 = h24 % 12
    if (h12 === 0) h12 = 12
    const value = `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    const label = `${h12}:${String(m).padStart(2, '0')} ${period}`
    options.push({ value, label })
  }
  return options
})()

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
  const { setEventDate, setEventTimeSlot, eventTimeSlot, setDeliveryType, setPickupTimeSlot, setExactTimeRequested, itemCount } = useCart()

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
  const [timeSlot, setTimeSlot] = useState('')
  const [specificTime, setSpecificTime] = useState('')
  const [returnSlot, setReturnSlot] = useState('')
  const [returnSpecificTime, setReturnSpecificTime] = useState('')
  const [appointmentSlot, setAppointmentSlot] = useState('')
  const [appointmentSpecificTime, setAppointmentSpecificTime] = useState('')
  const [wantsExactTime, setWantsExactTime] = useState(false)

useEffect(() => {
  fetch(`/api/categories/${slug}`)
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
    const controller = new AbortController()
    if (selectedDate) {
      const dateStr = formatDateShort(selectedDate)
      setEventDate(dateStr)
      fetch(`/api/items?date=${dateStr}&category=${slug}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => setItems(data.items || []))
        .catch((err) => { if (err.name !== 'AbortError') setItems([]) })
    } else {
      fetch(`/api/items?category=${slug}`, { signal: controller.signal })
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

  const isBookingBlocked = Boolean(
    category?.bookableAfter && new Date() < new Date(category.bookableAfter)
  )

  const handleSelectMethod = (method: 'delivery' | 'pickup') => {
    setBookingMethod(method); if (typeof window !== 'undefined') localStorage.setItem('fpr_bookingMethod', method)
  }

  const handleChangeMethod = () => {
    if (typeof window !== 'undefined') {
            localStorage.removeItem('fpr_bookingMethod')
            localStorage.removeItem('fpr_browseWithoutDate')
    }
    setBookingMethod('')
    setSelectedDate(null)
    setTimeConfirmed(false)
    setTimeSlot('')
    setSpecificTime('')
    setReturnSlot('')
    setReturnSpecificTime('')
    setAppointmentSlot('')
    setAppointmentSpecificTime('')
    setWantsExactTime(false)
  }

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date)
    setTimeConfirmed(false)
    setTimeSlot('')
    setSpecificTime('')
    setReturnSlot('')
    setReturnSpecificTime('')
    setAppointmentSlot('')
    setAppointmentSpecificTime('')
    setWantsExactTime(false)
  }

  const handleConfirmTime = () => {
    setDeliveryType(bookingMethod || null)
    if (bookingMethod === 'delivery') {
      let finalDropLabel: string
      let finalReturnLabel: string
      if (wantsExactTime) {
        finalDropLabel = `Exact Time: ${specificTime}`
        finalReturnLabel = `Exact Time: ${returnSpecificTime}`
      } else {
        finalDropLabel = TIME_SLOTS.find((t) => t.value === timeSlot)?.label || ''
        finalReturnLabel = RETURN_TIME_SLOTS.find((t) => t.value === returnSlot)?.label || ''
      }
      setEventTimeSlot(finalDropLabel)
      setPickupTimeSlot(finalReturnLabel)
      setExactTimeRequested(wantsExactTime)
    } else {
      const label = APPOINTMENT_SLOTS.find((t) => t.value === appointmentSlot)?.label || ''
      const finalLabel = appointmentSlot === 'specific' && appointmentSpecificTime
        ? `Specific Time: ${appointmentSpecificTime}`
        : label
      setEventTimeSlot(finalLabel)
      setPickupTimeSlot(finalLabel)
      setExactTimeRequested(false)
    }
    setTimeConfirmed(true)
  }

  const handleChangeDate = () => {
    setSelectedDate(null)
    setTimeConfirmed(false)
    setTimeSlot('')
    setSpecificTime('')
    setReturnSlot('')
    setReturnSpecificTime('')
    setAppointmentSlot('')
    setAppointmentSpecificTime('')
    setWantsExactTime(false)
  }

  const showMethodPicker = !isBookingBlocked && !bookingMethod && !browseWithoutDate
  const showCalendar = !isBookingBlocked && !!bookingMethod && !selectedDate && !browseWithoutDate
  const showTimePicker = !isBookingBlocked && !!bookingMethod && !!selectedDate && !timeConfirmed
  const showItems = isBookingBlocked || browseWithoutDate || (!!selectedDate && timeConfirmed)
  const isPickupOrder = bookingMethod === 'pickup'

  const canContinue = bookingMethod === 'delivery'
    ? (wantsExactTime ? (!!specificTime && !!returnSpecificTime) : (!!timeSlot && !!returnSlot))
    : !!appointmentSlot && (appointmentSlot !== 'specific' || !!appointmentSpecificTime)

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
                  <div className="mb-4 bg-blue-50 border border-blue-200 rounded p-3">
                    <label className="flex items-start gap-2 text-sm text-body">
                      <input
                        type="checkbox"
                        checked={wantsExactTime}
                        onChange={(e) => {
                          setWantsExactTime(e.target.checked)
                          setTimeSlot('')
                          setReturnSlot('')
                          setSpecificTime('')
                          setReturnSpecificTime('')
                        }}
                        className="mt-1"
                      />
                      <span>
                        <span className="font-medium text-dark">I need a guaranteed exact time (+${EXACT_TIME_FEE_AMOUNT})</span> — otherwise we'll schedule you within a Morning or Afternoon window, delivered in the order our trucks fall in line on their route that day.
                      </span>
                    </label>
                  </div>

                  {wantsExactTime ? (
                    <>
                      <h2 className="font-bold text-dark mb-3">Exact drop-off time</h2>
                      <select
                        value={specificTime}
                        onChange={(e) => setSpecificTime(e.target.value)}
                        className="w-full border rounded px-3 py-2 mb-4"
                      >
                        <option value="">Select a time</option>
                        {EXACT_TIME_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <h2 className="font-bold text-dark mb-3">Exact pick-up time</h2>
                      <select
                        value={returnSpecificTime}
                        onChange={(e) => setReturnSpecificTime(e.target.value)}
                        className="w-full border rounded px-3 py-2 mb-4"
                      >
                        <option value="">Select a time</option>
                        {EXACT_TIME_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <>
                      <h2 className="font-bold text-dark mb-3">When should we drop it off?</h2>
                      <div className="space-y-2 mb-2">
                        {FREE_DROPOFF_SLOTS.map((slot) => (
                          <label key={slot.value} className="flex items-center gap-2 text-sm text-body">
                            <input
                              type="radio"
                              name="timeSlot"
                              value={slot.value}
                              checked={timeSlot === slot.value}
                              onChange={() => setTimeSlot(slot.value)}
                            />
                            {slot.label}
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mb-4">We don't guarantee an exact time within your window — trucks are scheduled in the order deliveries fall in line along that day's route.</p>

                      <h2 className="font-bold text-dark mb-3">When should we pick it up?</h2>
                      <div className="space-y-2 mb-4">
                        {FREE_RETURN_SLOTS.map((slot) => (
                          <label key={slot.value} className="flex items-center gap-2 text-sm text-body">
                            <input
                              type="radio"
                              name="returnSlot"
                              value={slot.value}
                              checked={returnSlot === slot.value}
                              onChange={() => setReturnSlot(slot.value)}
                            />
                            {slot.label}
                          </label>
                        ))}
                      </div>
                    </>
                  )}
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
                        {items.filter((item) => item.name.toLowerCase().includes('package')).map((item) => (
                          <ItemCard
                          key={item.id}
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
                        {items.filter((item) => !item.name.toLowerCase().includes('package')).map((item) => (
                          <ItemCard
                          key={item.id}
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
                  {items.map((item) => (
                    <ItemCard
                      key={item.id}
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
