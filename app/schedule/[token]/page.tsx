'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
]

function formatTimeLabel(time: string) {
  const [hStr, mStr] = time.split(':')
  const h = parseInt(hStr, 10)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayHour = h % 12 === 0 ? 12 : h % 12
  return displayHour + ':' + mStr + ' ' + period
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function ScheduleMeetingPage() {
  const params = useParams<{ token: string }>()
  const token = (params?.token as string) || ''
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [zoomLink, setZoomLink] = useState('')

  const today = startOfDay(new Date())
  const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState('')

  useEffect(() => {
    if (!token) return
    fetch('/api/schedule/' + token)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'This scheduling link is invalid or has already been used.')
        } else {
          setCustomerName(data.customerName || '')
          if (data.alreadyScheduled) {
            setZoomLink(data.zoomLink || '')
            setDone(true)
          }
        }
      })
      .catch(() => setError('Something went wrong loading this page.'))
      .finally(() => setLoading(false))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDate || !selectedTime) return
    const dateTime = selectedDate.getFullYear() + '-' + pad(selectedDate.getMonth() + 1) + '-' + pad(selectedDate.getDate()) + 'T' + selectedTime
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/schedule/' + token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: dateTime, note }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
      } else {
        setZoomLink(data.zoomLink || '')
          setDone(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white border rounded-lg shadow-sm p-6 text-center">
          <h1 className="text-xl font-bold text-admin-green mb-2">You're all set!</h1>
          <p className="text-gray-600">Thanks{customerName ? ', ' + customerName : ''}! Your meeting time has been confirmed. We'll see you then.</p>
          {zoomLink && (
            <a href={zoomLink} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block bg-admin-green text-white font-semibold rounded-lg px-4 py-2">Join Zoom Meeting</a>
          )}
</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white border rounded-lg shadow-sm p-6 text-center">
          <h1 className="text-xl font-bold text-gray-800 mb-2">Link unavailable</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
  const firstWeekday = firstOfMonth.getDay()
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d))
  while (cells.length % 7 !== 0) cells.push(null)

  const isCurrentMonth = viewMonth.getFullYear() === today.getFullYear() && viewMonth.getMonth() === today.getMonth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full bg-white border rounded-lg shadow-sm p-6">
        <h1 className="text-xl font-bold text-gray-800 mb-1">Schedule your call</h1>
        <p className="text-gray-600 text-sm mb-4">
          {customerName ? 'Hi ' + customerName + ', pick' : 'Pick'} a date and time that works for you and we'll meet you on Zoom then.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                  disabled={isCurrentMonth}
                  className="px-2 py-1 text-gray-500 hover:text-gray-800 disabled:opacity-30"
                  aria-label="Previous month"
                >
                  &#8249;
                </button>
                <span className="text-sm font-medium text-gray-800">
                  {MONTH_NAMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
                </span>
                <button
                  type="button"
                  onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                  className="px-2 py-1 text-gray-500 hover:text-gray-800"
                  aria-label="Next month"
                >
                  &#8250;
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
                {DAY_NAMES.map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((day, idx) => {
                  if (!day) return <div key={idx} />
                  const isPast = day < today
                  const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isPast}
                      onClick={() => setSelectedDate(day)}
                      className={
                        'text-sm rounded py-1 ' +
                        (isSelected
                          ? 'bg-admin-green text-white font-semibold'
                          : isPast
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-100')
                      }
                    >
                      {day.getDate()}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
            <div className="grid grid-cols-3 gap-2">
              {TIME_SLOTS.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setSelectedTime(time)}
                  className={
                    'text-sm rounded px-2 py-1.5 border ' +
                    (selectedTime === time
                      ? 'bg-admin-green text-white border-admin-green font-semibold'
                      : 'text-gray-700 border-gray-300 hover:bg-gray-50')
                  }
                >
                  {formatTimeLabel(time)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Anything you'd like us to know? (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !selectedDate || !selectedTime}
            className="w-full bg-admin-green text-white rounded px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            {submitting ? 'Booking...' : 'Confirm time'}
          </button>
        </form>
      </div>
    </div>
  )
}
