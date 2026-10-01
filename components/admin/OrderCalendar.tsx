'use client'

import { useState } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  isToday,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Sun } from 'lucide-react'

export interface CalendarOrder {
  id: string
  orderNumber: string
  status: string
  deliveryType: string
  customerName: string
  eventDate: string
  eventEndDate?: string | null
  deliveredAt?: string | null
  pickedUpAt?: string | null
}

interface OrderCalendarProps {
  orders: CalendarOrder[]
  closedDates?: string[]
  currentMonth?: Date
  minYear?: number
  onMonthChange?: (date: Date) => void
  onDateClick?: (date: Date) => void
  filter?: string
  onFilterChange?: (filter: string) => void
  jobFilter?: string
  compact?: boolean
}

const FILTERS = [
  'All Orders',
  'Active',
  'Active-Deliver',
  'Active-Customer Pickup',
  'Incomplete',
  'Sent Quotes',
  'Canceled',
  'Orders Created',
]

function matchesStatus(order: CalendarOrder, filter: string) {
  if (filter === 'All Orders' || filter === 'Orders Created') return true
  if (filter === 'Canceled') return order.status === 'canceled' || order.status === 'cancelled'
  if (filter === 'Incomplete') return order.status === 'incomplete'
  if (filter === 'Sent Quotes') return order.status === 'quote'
  if (filter === 'Active-Deliver') return order.status === 'active' && order.deliveryType === 'delivery'
  if (filter === 'Active-Customer Pickup') return order.status === 'active' && order.deliveryType === 'pickup'
  return order.status === 'active'
}

function rentalDates(order: CalendarOrder) {
  const start = order.eventDate.slice(0, 10)
  const end = order.eventEndDate ? order.eventEndDate.slice(0, 10) : start
  return { start, end }
}

function jobKind(order: CalendarOrder, day: string) {
  const { start, end } = rentalDates(order)
  if (order.deliveryType === 'pickup') return 'customerPickup'
  if (order.pickedUpAt) return 'complete'
  if (day === end && (day !== start || order.deliveredAt)) return 'collection'
  return 'delivery'
}

function matchesJob(order: CalendarOrder, day: string, filter: string) {
  if (filter === 'all') return true
  return jobKind(order, day) === filter
}

export default function OrderCalendar({
  orders,
  closedDates = [],
  currentMonth: initialMonth,
  minYear = 2021,
  onMonthChange,
  onDateClick,
  filter = 'Active',
  onFilterChange,
  jobFilter = 'all',
  compact = false,
}: OrderCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(initialMonth || new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPadding = monthStart.getDay()

  const changeMonth = (date: Date) => {
    setCurrentMonth(date)
    onMonthChange?.(date)
  }

  const ordersByDay = days.map((day) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    let deliveryCount = 0
    let pickupCount = 0
    let customerPickupCount = 0

    orders.filter((order) => matchesStatus(order, filter) && matchesJob(order, dayStr, jobFilter)).forEach((order) => {
      if (order.status === 'canceled' || order.status === 'cancelled') return
      const { start, end } = rentalDates(order)
      if (order.deliveryType === 'pickup') {
        if (dayStr === start || dayStr === end) customerPickupCount++
        return
      }
      if (dayStr === start) deliveryCount++
      if (dayStr === end) pickupCount++
    })

    return { day, deliveryCount, pickupCount, customerPickupCount }
  })

  const isClosed = (date: Date) => closedDates.some((d) => d.slice(0, 10) === format(date, 'yyyy-MM-dd'))

  return (
    <div className={compact ? '' : 'bg-white rounded shadow'}>
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <button onClick={() => changeMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-gray-200 rounded" aria-label="Previous month">
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <select
            value={currentMonth.getMonth()}
            onChange={(e) => changeMonth(new Date(currentMonth.getFullYear(), parseInt(e.target.value), 1))}
            className="border rounded px-2 py-1 text-sm"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>{format(new Date(2026, i, 1), 'MMMM')}</option>
            ))}
          </select>
          <select
            value={currentMonth.getFullYear()}
            onChange={(e) => changeMonth(new Date(parseInt(e.target.value), currentMonth.getMonth(), 1))}
            className="border rounded px-2 py-1 text-sm"
          >
            {Array.from({ length: Math.max(1, new Date().getFullYear() + 2 - minYear) }, (_, i) => minYear + i).map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <button onClick={() => changeMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-gray-200 rounded" aria-label="Next month">
          <ChevronRight size={18} />
        </button>
      </div>

      {onFilterChange && (
        <div className="p-2 border-b">
          <select
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            className="border rounded px-2 py-1 text-sm w-full"
          >
            {FILTERS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      )}

      <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 border-b">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day} className="py-2">{day}</div>)}
      </div>

      <div className="grid grid-cols-7">
        {Array.from({ length: startPadding }).map((_, i) => <div key={'pad-' + i} className="min-h-[80px] border border-gray-100 bg-gray-50" />)}
        {ordersByDay.map(({ day, deliveryCount, pickupCount, customerPickupCount }) => {
          const closed = isClosed(day)
          const today = isToday(day)
          return (
            <div
              key={day.toISOString()}
              className={`min-h-[80px] border border-gray-100 p-1 cursor-pointer hover:bg-blue-50 transition-colors
                ${!isSameMonth(day, currentMonth) ? 'bg-gray-50' : ''}
                ${closed ? 'bg-red-50' : ''}
                ${today ? 'ring-2 ring-inset ring-secondary' : ''}
              `}
              onClick={() => onDateClick?.(day)}
            >
              <div className="flex items-center justify-between">
                <span className={today ? 'text-xs font-bold text-white bg-secondary rounded-full w-5 h-5 flex items-center justify-center' : 'text-xs font-medium text-gray-600'}>{format(day, 'd')}</span>
                {closed && <span className="text-[10px] text-red-500 font-bold">closed</span>}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {deliveryCount > 0 && <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-green-500 text-white text-[10px] font-bold px-1" title={deliveryCount + ' Delivery'}>{deliveryCount}</span>}
                {customerPickupCount > 0 && <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-600 text-white text-[10px] font-bold px-1" title={customerPickupCount + ' Customer pickup / return'}>{customerPickupCount}</span>}
                {pickupCount > 0 && <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-blue-600 text-white text-[10px] font-bold px-1" title={pickupCount + ' Pickup from event'}>{pickupCount}</span>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="p-2 border-t text-xs text-gray-500 flex flex-wrap gap-4">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border-2 border-green-600 bg-green-50" />Delivery / drop-off</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border-2 border-blue-600 bg-blue-50" />Pickup from event</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border-2 border-red-600 bg-red-50" />Customer pickup / return</span>
        <span className="inline-flex items-center gap-1"><Sun size={12} className="text-yellow-500" /> Holiday</span>
      </div>
    </div>
  )
}
