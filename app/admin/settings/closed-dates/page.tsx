'use client'

import { useEffect, useState } from 'react'
import BookingCalendar from '@/components/public/BookingCalendar'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function ClosedDatesPage() {
  const [closedDates, setClosedDates] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  useEffect(() => {
    fetch('/api/closed-dates')
      .then((r) => r.json())
      .then((d) => setClosedDates(d.dates || []))
  }, [])

  const addClosedDate = async () => {
    if (!selectedDate) return
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const res = await fetch('/api/admin/closed-dates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateStr }),
    })
    if (res.ok) {
      setClosedDates([...closedDates, dateStr])
      toast.success('Date marked as closed')
    }
  }

  const removeClosedDate = async (dateStr: string) => {
    const res = await fetch('/api/admin/closed-dates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateStr }),
    })
    if (res.ok) {
      setClosedDates(closedDates.filter((d) => d !== dateStr))
      toast.success('Date removed')
    }
  }

  return (
    <div className="p-4 max-w-2xl">
      <h1 className="text-xl font-bold text-dark mb-6">Closed Dates</h1>
      <BookingCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} closedDates={closedDates} />
      <div className="mt-4 flex gap-2">
        <button onClick={addClosedDate} className="btn-admin" disabled={!selectedDate}>Mark as Closed</button>
      </div>
      <div className="mt-6 bg-white rounded shadow p-4">
        <h2 className="font-bold text-dark mb-3">Closed Dates</h2>
        {closedDates.length === 0 ? (
          <p className="text-gray-400 text-sm">No closed dates</p>
        ) : (
          <ul className="space-y-2">
            {closedDates.map((d) => (
              <li key={d} className="flex justify-between items-center text-sm">
                <span>{d}</span>
                <button onClick={() => removeClosedDate(d)} className="text-red-500 hover:underline text-xs">Remove</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
