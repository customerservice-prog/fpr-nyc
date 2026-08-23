'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import OrderCalendar from '@/components/admin/OrderCalendar'
import { format } from 'date-fns'

interface DayOrder {
  id: string
  orderNumber: string
  status: string
  deliveryType: string
  customerName: string
  customerPhone?: string | null
  customerEmail?: string | null
  eventDate: string
  eventEndDate?: string | null
  eventTimeSlot?: string | null
  pickupTimeSlot?: string | null
  eventAddress?: string | null
  eventCity?: string | null
  eventState?: string | null
  eventZip?: string | null
  subtotal?: number
  deliveryFee?: number
  taxAmount?: number
  damageWaiver?: boolean
  damageWaiverFee?: number
  depositAmount?: number
  tipAmount?: number
  totalAmount?: number
  amountPaid?: number
  balanceDue?: number
  notes?: string | null
  internalNotes?: string | null
  couponCode?: string | null
  couponDiscount?: number
  items?: Array<{ id: string; itemName: string; quantity: number; unitPrice?: number; total?: number }>
}

export default function SchedulingPage() {
  const [orders, setOrders] = useState<DayOrder[]>([])
  const [closedDates, setClosedDates] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    fetch(`/api/admin/dashboard?month=${currentMonth.getMonth()}&year=${currentMonth.getFullYear()}`)
      .then((r) => r.json())
      .then((d) => {
        setOrders(d.calendarOrders || [])
        setClosedDates((d.closedDates || []).map((dt: string) => dt.slice(0, 10)))
      })
  }, [currentMonth])

  const dayOrders = selectedDate
    ? orders.filter((o) => {
        const dStr = format(selectedDate, 'yyyy-MM-dd')
        const startStr = o.eventDate.slice(0, 10)
        const endStr = o.eventEndDate ? o.eventEndDate.slice(0, 10) : startStr
        return dStr >= startStr && dStr <= endStr
      })
    : []

  const dayRelation = (o: DayOrder) => {
    if (!selectedDate) return 'ongoing'
    const dStr = format(selectedDate, 'yyyy-MM-dd')
    const startStr = o.eventDate.slice(0, 10)
    const endStr = o.eventEndDate ? o.eventEndDate.slice(0, 10) : startStr
    if (startStr === endStr) return 'single'
    if (dStr === startStr) return 'dropoff'
    if (dStr === endStr) return 'pickup'
    return 'ongoing'
  }

  const money = (n?: number) => `$${(n || 0).toFixed(2)}`

  const formatTimeLabel = (dateIso: string, slot?: string | null) => {
    if (slot) return slot
    try {
      return format(new Date(dateIso), 'h:mmaaa')
    } catch {
      return ''
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-dark">Scheduling</h1>
        <Link href="/admin/orders/new" className="btn-admin">+ BOOK</Link>
      </div>

      <OrderCalendar
        orders={orders}
        closedDates={closedDates}
        onDateClick={setSelectedDate}
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
      />

      {selectedDate && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-dark">
              Orders for {format(selectedDate, 'MMMM d, yyyy')}
            </h2>
            <Link
              href={`/admin/orders/new?date=${format(selectedDate, 'yyyy-MM-dd')}`}
              className="btn-admin"
            >
              + BOOK
            </Link>
          </div>
          {dayOrders.length === 0 ? (
            <p className="text-gray-400 text-sm">No Orders Found</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {dayOrders.map((o) => {
                const isPaidInFull = (o.balanceDue || 0) <= 0.01
                const headerColor = isPaidInFull ? 'bg-green-600' : (o.amountPaid || 0) > 0 ? 'bg-blue-600' : 'bg-gray-500'
                const relation = dayRelation(o)
                const relationLabel = relation === 'dropoff' ? '🚚 Drop-off Today' : relation === 'pickup' ? '📦 Pickup Today' : relation === 'single' ? '🚚📦 Drop-off & Pickup Today' : '⏳ Ongoing Rental (already delivered)'
                return (
                  <div key={o.id} className="bg-white rounded-lg shadow overflow-hidden border">
                    <div className={`${headerColor} text-white px-4 py-2 flex items-center justify-between`}>
                      <span className="font-bold">Order #{o.orderNumber}</span>
                      <span className="text-xs uppercase tracking-wide bg-white/20 rounded px-2 py-0.5">{o.deliveryType}</span>
                    </div>
                    <div className="bg-yellow-50 text-yellow-800 text-xs font-semibold px-4 py-1 border-b border-yellow-200">{relationLabel}</div>
                    <div className="p-4">
                      {o.items && o.items.length > 0 && (
                        <ul className="text-sm text-dark mb-2 list-disc list-inside">
                          {o.items.map((it) => (
                            <li key={it.id}>
                              {it.itemName} x {it.quantity}
                              {typeof it.unitPrice === 'number' && (
                                <span className="text-gray-400"> ({money(it.unitPrice)} x {it.quantity} = {money(it.total ?? it.unitPrice * it.quantity)})</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="text-sm text-body mb-2">
                        <div><span className="font-medium">Drop-off:</span> {format(new Date(o.eventDate.slice(0,10)+'T00:00:00'), 'EEE, MMM d, yyyy')} {formatTimeLabel(o.eventDate, o.eventTimeSlot)}</div>
                        {(o.eventEndDate || o.pickupTimeSlot) && (
                          <div><span className="font-medium">Pickup:</span> {o.eventEndDate ? format(new Date(o.eventEndDate.slice(0,10)+'T00:00:00'), 'EEE, MMM d, yyyy') : format(new Date(o.eventDate.slice(0,10)+'T00:00:00'), 'EEE, MMM d, yyyy')} {o.pickupTimeSlot || ''}</div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mb-2">
                        <Link href={`/admin/orders/${o.id}`} className="text-secondary font-medium hover:underline">
                          {o.customerName}
                        </Link>
                        <span className={`text-sm font-bold px-2 py-0.5 rounded ${isPaidInFull ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {money(o.amountPaid)} / {money(o.totalAmount)}
                        </span>
                      </div>

                      {!!o.damageWaiverFee && (
                        <div className="text-xs text-gray-500 mb-1">Damage Waiver: {money(o.damageWaiverFee)}</div>
                      )}
                      {!!o.deliveryFee && (
                        <div className="text-xs text-gray-500 mb-1">Travel Fee: {money(o.deliveryFee)}</div>
                      )}
                      {!!o.taxAmount && (
                        <div className="text-xs text-gray-500 mb-1">Tax: {money(o.taxAmount)}</div>
                      )}
                      {!!o.tipAmount && (
                        <div className="text-xs text-gray-500 mb-1">Tip: {money(o.tipAmount)}</div>
                      )}
                      {!!o.couponDiscount && (
                        <div className="text-xs text-green-700 mb-1">Coupon{o.couponCode ? ` (${o.couponCode})` : ''}: -{money(o.couponDiscount)}</div>
                      )}

                      {!isPaidInFull && (
                        <div className="text-sm font-semibold text-red-600 mb-2">Due: {money(o.balanceDue)}</div>
                      )}

                      <div className="text-xs text-gray-500 mb-2">
                        {o.eventAddress && <div>{o.eventAddress}, {o.eventCity} {o.eventState} {o.eventZip}</div>}
                        <div className="flex gap-3 mt-1">
                          {o.customerPhone && <a href={`tel:${o.customerPhone}`} className="text-secondary hover:underline">{o.customerPhone}</a>}
                          {o.customerEmail && !o.customerEmail.includes('@imported.friendlypartyrental.local') && !o.customerEmail.startsWith('no-email-') && <a href={`mailto:${o.customerEmail}`} className="text-secondary hover:underline">{o.customerEmail}</a>}
                        </div>
                      </div>

                      {o.internalNotes && (
                        <p className="text-xs bg-yellow-50 border border-yellow-200 rounded p-2 mb-2"><span className="font-semibold">Internal Notes:</span> {o.internalNotes}</p>
                      )}
                      {o.notes && (
                        <p className="text-xs bg-teal-50 border border-teal-200 rounded p-2 mb-2"><span className="font-semibold">Customer Comments:</span> {o.notes}</p>
                      )}

                      <div className="flex items-center gap-3 pt-2 border-t text-xs">
                        <Link href={`/admin/orders/${o.id}`} className="text-secondary hover:underline font-medium">View / Edit Order</Link>
                        <span className="capitalize text-gray-400">{o.status}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
