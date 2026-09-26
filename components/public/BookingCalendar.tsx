'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isBefore,
  startOfDay,
} from 'date-fns'

interface BookingCalendarProps {
  selectedDate: Date | null
  onSelectDate: (date: Date) => void
  closedDates?: string[]
}

export default function BookingCalendar({
  selectedDate,
  onSelectDate,
  closedDates = [],
}: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const today = startOfDay(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const startPadding = monthStart.getDay()
  const paddingDays = Array.from({ length: startPadding }, (_, i) => i)

  const isClosed = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return closedDates.includes(dateStr)
  }

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(currentMonth.getFullYear(), i, 1)
    return { value: i, label: format(d, 'MMMM') }
  })

  const years = Array.from({ length: 3 }, (_, i) => currentMonth.getFullYear() + i)

  return (
    <div className="bg-white rounded-lg shadow-lg border border-primary/50 p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-3 hover:bg-gray-100 rounded"
          aria-label="Previous month"
        >
          <ChevronLeft size={28} />
        </button>
        <div className="flex gap-2">
          <select
            value={currentMonth.getMonth()}
            onChange={(e) =>
              setCurrentMonth(new Date(currentMonth.getFullYear(), parseInt(e.target.value), 1))
            }
            className="border rounded px-3 py-2 text-base font-medium"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            value={currentMonth.getFullYear()}
            onChange={(e) =>
              setCurrentMonth(new Date(parseInt(e.target.value), currentMonth.getMonth(), 1))
            }
            className="border rounded px-3 py-2 text-base font-medium"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-3 hover:bg-gray-100 rounded"
          aria-label="Next month"
        >
          <ChevronRight size={28} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-sm font-semibold text-body mb-3">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {paddingDays.map((i) => (
          <div key={`pad-${i}`} className="h-16" />
        ))}
        {days.map((day) => {
          const isPast = isBefore(day, today)
          const disabled = isPast || isClosed(day)
          const selected = selectedDate && isSameDay(day, selectedDate)
          const closed = isClosed(day)

          return (
            <button
              key={day.toISOString()}
              onClick={() => !disabled && onSelectDate(day)}
              disabled={disabled}
              title={isPast ? 'Closed (past date)' : undefined}
              className={`h-16 rounded-lg text-lg font-medium transition-colors
                ${!isSameMonth(day, currentMonth) ? 'text-gray-300' : ''}
                ${selected ? 'bg-secondary text-white' : ''}
                ${isPast ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : disabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-primary/30'}
                ${closed && !isPast ? 'bg-red-100 text-red-400' : ''}
              `}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}
