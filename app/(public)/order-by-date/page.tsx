'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BookingCalendar from '@/components/public/BookingCalendar'
import { formatDateShort } from '@/lib/utils'

const BOOKING_START = new Date(2027, 0, 1)

export default function OrderByDatePage() {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [closedDates, setClosedDates] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/closed-dates')
      .then((r) => r.json())
      .then((data) => setClosedDates(data.dates || []))
      .catch(() => {})
  }, [])

  const handleSelect = (date: Date) => {
    setSelectedDate(date)
  }

  const handleContinue = () => {
    if (!selectedDate) return
    router.push(`/items?date=${formatDateShort(selectedDate)}`)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-bold text-dark mb-2 text-center">Pick Your 2027+ Event Date</h1>
      <p className="text-body text-center mb-7">
        Riverdale / NYC online reservations are open for events on or after January 1, 2027.
      </p>

      <BookingCalendar
        selectedDate={selectedDate}
        onSelectDate={handleSelect}
        closedDates={closedDates}
        minDate={BOOKING_START}
      />

      {selectedDate && (
        <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your Event</p>
          <p className="mt-1 font-bold text-dark">
            <strong>{selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
          </p>
          <button type="button" onClick={handleContinue} className="btn-primary mt-4 w-full sm:w-auto sm:px-8">
            SEE AVAILABLE RENTALS →
          </button>
        </div>
      )}
    </div>
  )
}
