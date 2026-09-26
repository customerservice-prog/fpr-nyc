'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BookingCalendar from '@/components/public/BookingCalendar'
import { formatDateShort } from '@/lib/utils'

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
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-dark mb-2 text-center">Order by Date</h1>
      <p className="text-body text-center mb-8">
        Select your event date to see available rentals
      </p>

      <BookingCalendar
        selectedDate={selectedDate}
        onSelectDate={handleSelect}
        closedDates={closedDates}
      />

      {selectedDate && (
        <div className="mt-6 text-center">
          <p className="text-body mb-4">
            Selected: <strong>{selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
          </p>
          <button onClick={handleContinue} className="btn-primary">
            View Available Items
          </button>
        </div>
      )}
    </div>
  )
}
