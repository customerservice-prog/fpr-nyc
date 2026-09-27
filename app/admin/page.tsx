'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import OrderCalendar from '@/components/admin/OrderCalendar'
import BestSellersChart from '@/components/admin/BestSellersChart'
import WeatherWidget from '@/components/admin/WeatherWidget'
import RevenueChart from '@/components/admin/RevenueChart'
import MediaPanel from '@/components/admin/MediaPanel'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'

interface DashboardData {
  collectedToday: number
  inventoryCount: number
  calendarOrders: Array<{
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
  }>
  closedDates: string[]
  tasks: Array<{ id: string; title: string; completed: boolean }>
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [bestSellers, setBestSellers] = useState<Array<{ name: string; count: number }>>([])
  const [revenue, setRevenue] = useState<Array<{ month: string; revenue: number }>>([])
  const [filter, setFilter] = useState('Active')
  const [newTask, setNewTask] = useState('')
  async function handleAddTask() {
    if (!newTask.trim()) return
    const res = await fetch('/api/admin/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTask.trim() }),
    })
    if (res.ok) {
      const { task } = await res.json()
      setData((prev) => (prev ? { ...prev, tasks: [task, ...prev.tasks] } : prev))
      setNewTask('')
    }
  }

  async function handleToggleTask(id: string, completed: boolean) {
    const res = await fetch('/api/admin/tasks/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !completed }),
    })
    if (res.ok) {
      setData((prev) =>
        prev ? { ...prev, tasks: prev.tasks.map((t) => (t.id === id ? { ...t, completed: !completed } : t)) } : prev
      )
    }
  }

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const money = (n?: number) => `$${(n || 0).toFixed(2)}`

  const formatTimeLabel = (dateIso: string, slot?: string | null) => {
    if (slot) return slot
    try {
      return format(new Date(dateIso), 'h:mmaaa')
    } catch {
      return ''
    }
  }

  const dayOrders = selectedDate
    ? (data?.calendarOrders || []).filter((o) => {
        const dStr = format(selectedDate, 'yyyy-MM-dd')
        const startStr = o.eventDate.slice(0, 10)
        const endStr = o.eventEndDate ? o.eventEndDate.slice(0, 10) : startStr
        return dStr >= startStr && dStr <= endStr
      })
    : []

  const dayRelation = (o: { eventDate: string; eventEndDate?: string | null }) => {
    if (!selectedDate) return 'ongoing'
    const dStr = format(selectedDate, 'yyyy-MM-dd')
    const startStr = o.eventDate.slice(0, 10)
    const endStr = o.eventEndDate ? o.eventEndDate.slice(0, 10) : startStr
    if (startStr === endStr) return 'single'
    if (dStr === startStr) return 'dropoff'
    if (dStr === endStr) return 'pickup'
    return 'ongoing'
  }

  useEffect(() => {
    fetch(`/api/admin/dashboard?month=${currentMonth.getMonth()}&year=${currentMonth.getFullYear()}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
  }, [currentMonth])

  useEffect(() => {

    fetch('/api/admin/reports/best-sellers')
      .then((r) => r.json())
      .then((d) => setBestSellers(d.data || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/admin/reports/monthly-revenue')
      .then((r) => r.json())
      .then((d) => setRevenue(d.data || []))
      .catch(() => {})
  }, [])

  const closedDateStrings = data?.closedDates?.map((d) => format(new Date(d.slice(0,10)+'T00:00:00'), 'yyyy-MM-dd')) || []

  return (
    <div className="p-4">
        <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <OrderCalendar
            orders={data?.calendarOrders || []}
            closedDates={closedDateStrings}
            filter={filter}
            onFilterChange={setFilter}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            onDateClick={(d) => setSelectedDate(d)}
            compact
          />
          <MediaPanel />
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-[6px] border-admin-green">
            <p className="text-base text-gray-500 font-medium">Collected Today</p>
            <p className="text-4xl font-bold text-dark mt-1">
              {formatCurrency(data?.collectedToday || 0)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-[6px] border-secondary">
            <p className="text-base text-gray-500 font-medium">Inventory Count (items $65+)</p>
            <p className="text-4xl font-bold text-dark mt-1">{data?.inventoryCount || 0}</p>
          </div>

          <div className="bg-white rounded shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-dark text-lg">Tasks</h3>
              <button onClick={handleAddTask} className="text-sm bg-admin-green text-white px-3 py-1.5 rounded">Add New Task</button>
            </div>
            <ul className="space-y-2">
              {(data?.tasks || []).map((task) => (
                <li key={task.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={task.completed} onChange={() => handleToggleTask(task.id, task.completed)} className="rounded" />
                  <span className={task.completed ? 'line-through text-gray-400' : ''}>{task.title}</span>
                </li>
              ))}
              {(!data?.tasks || data.tasks.length === 0) && (
                <li className="text-gray-400 text-sm">No tasks yet</li>
              )}
            </ul>
            <input
              type="text"
              placeholder="Add a task..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask() }}
              className="mt-3 w-full border rounded px-2 py-1 text-sm"
            />
          </div>

          <div className="bg-white rounded shadow p-4">
            <h3 className="font-bold text-dark text-sm mb-3">Best Sellers (Last 60 Days)</h3>
            <BestSellersChart data={bestSellers} />
          </div>

          <div className="bg-white rounded shadow p-4">
            <h3 className="font-bold text-dark text-sm mb-2">Weather — Riverdale, NY</h3>
            <WeatherWidget />

          </div>

          <div className="bg-white rounded shadow p-4">
            <Link href="/admin/reports" className="text-secondary text-sm hover:underline">
              Month to Date → Go to report
            </Link>
          </div>

          <div className="bg-white rounded shadow p-4">
            <h3 className="font-bold text-dark text-base mb-2">Recent Platform Updates</h3>
            <ul className="text-xs text-body space-y-1">
              <li>• New online booking system launched</li>
              <li>• Gallery management added</li>
              <li>• Improved order calendar view</li>
            </ul>
          </div>

          <div className="bg-white rounded shadow p-4">
            <h3 className="font-bold text-dark text-base mb-2">Control Panel Colors</h3>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2"><span className="admin-badge-active" /> Active (delivery)</div>
              <div className="flex items-center gap-2"><span className="admin-badge-pickup" /> Active (pickup) / Incomplete</div>
              <div className="flex items-center gap-2"><span className="admin-badge-multiday" /> Multiday</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4 mt-4">
        <h3 className="font-bold text-dark text-sm mb-3">Monthly Payments Received</h3>
        <RevenueChart data={revenue} />
      </div>

      {selectedDate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-4" onClick={() => setSelectedDate(null)}>
          <div className="bg-gray-50 rounded-lg shadow-xl max-w-5xl w-full my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b bg-white rounded-t-lg sticky top-0">
              <h2 className="text-lg font-bold text-dark">Orders for {format(selectedDate, 'EEEE, MMMM d, yyyy')}</h2>
              <button onClick={() => setSelectedDate(null)} className="text-gray-500 hover:text-gray-800 text-xl font-bold px-2">&times;</button>
            </div>
            <div className="p-4">
              {dayOrders.length === 0 ? (
                <p className="text-gray-400 text-sm">No orders for this date</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {dayOrders.map((o) => {
                    const trueBalanceDue = Math.round(((o.totalAmount || 0) - (o.amountPaid || 0)) * 100) / 100; const isPaidInFull = trueBalanceDue <= 0.01
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
                                    <span className="text-gray-400"> ({money(it.unitPrice)} x {it.quantity} = {money(it.total)})</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}

                          <div className="text-sm text-body mb-2">
                            <div><span className="font-medium">Drop-off:</span> {format(new Date(o.eventDate.slice(0,10)+'T00:00:00'), 'EEE, MMM d, yyyy')} {formatTimeLabel(o.eventDate, o.eventTimeSlot)}</div>
                            {(o.eventEndDate || o.pickupTimeSlot) && (
                              <div><span className="font-medium">Pickup:</span> {o.eventEndDate ? format(new Date(o.eventEndDate.slice(0,10)+'T00:00:00'), 'EEE, MMM d, yyyy') : format(new Date(o.eventDate.slice(0,10)+'T00:00:00'), 'EEE, MMM d, yyyy')} {formatTimeLabel(o.eventEndDate || o.eventDate, o.pickupTimeSlot)}</div>
                            )}
                          </div>

                          <div className="flex items-center justify-between mb-2">
                            <Link href={`/admin/orders/${o.id}`} className="text-secondary font-medium hover:underline">
                              {o.customerName}
                            </Link>
                            <span className={`text-sm font-bold px-2 py-0.5 rounded ${isPaidInFull ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'}`}>
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

                          {trueBalanceDue > 0.01 && (
                            <p className="text-red-600 text-sm font-semibold mb-2">Due: {money(trueBalanceDue)}</p>
                          )}
                          {trueBalanceDue < -0.01 && (
                            <p className="text-green-600 text-sm font-semibold mb-2">Overpaid by {money(Math.abs(trueBalanceDue))}</p>
                          )}                          
                          <div className="text-xs text-gray-500 mb-2">
                            {o.eventAddress && <div>{o.eventAddress}</div>}
                            {(o.eventCity || o.eventZip) && <div>{o.eventCity}, {o.eventState} {o.eventZip}</div>}
                            {o.customerPhone && <div><a href={`tel:${o.customerPhone}`} className="hover:underline">{o.customerPhone}</a></div>}
                            {o.customerEmail && !o.customerEmail.includes('@imported.friendlypartyrental.local') && !o.customerEmail.startsWith('no-email-') && (
                              <div><a href={`mailto:${o.customerEmail}`} className="hover:underline">{o.customerEmail}</a></div>
                            )}
                          </div>

                          {o.internalNotes && <p className="text-xs bg-yellow-50 border border-yellow-200 rounded p-2 mb-2"><span className="font-semibold">Internal Notes:</span> {o.internalNotes}</p>}
                          {o.notes && <p className="text-xs bg-teal-50 border border-teal-200 rounded p-2 mb-2"><span className="font-semibold">Customer Comments:</span> {o.notes}</p>}

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
              <div className="pt-2">
                <Link href="/admin/scheduling" className="text-secondary text-sm hover:underline font-medium">Open full Scheduling page &rarr;</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
