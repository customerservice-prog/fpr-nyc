'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BookingCalendar from './BookingCalendar'
import { formatDateShort } from '@/lib/utils'

export default function HomeBookingWidget() {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [closedDates, setClosedDates] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/closed-dates')
      .then((r) => r.json())
      .then((data) => setClosedDates(data.dates || []))
      .catch(() => {})
  }, [])

  const handleContinue = () => {
    if (!selectedDate) return
    router.push('/items?date=' + formatDateShort(selectedDate))
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
      <h3 className="text-xl font-bold text-dark mb-4 text-center">Book Your Rentals Online</h3>
      <BookingCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} closedDates={closedDates} />
      <button
        onClick={handleContinue}
        disabled={!selectedDate}
        className="btn-gold w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue to Rentals
      </button>
    </div>
  )
}
