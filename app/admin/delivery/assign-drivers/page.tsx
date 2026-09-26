'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Driver {
  id: string
  name: string
}

interface AssignOrder {
  id: string
  orderNumber: string
  status: string
  deliveryType: string
  eventDate: string
  eventTimeSlot?: string
  eventAddress?: string
  eventCity?: string
  eventState?: string
  eventZip?: string
  driverId: string | null
  driverName: string | null
  pickupDriverId: string | null
  pickupDriverName: string | null
  routeSequence: number | null
  pickupRouteSequence: number | null
  customer: { firstName: string; lastName: string; phone?: string }
}

function toDateInputValue(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function getInitialDate() {
  if (typeof window === 'undefined') return toDateInputValue(new Date())
  const params = new URLSearchParams(window.location.search)
  return params.get('date') || toDateInputValue(new Date())
}

export default function AssignDriversPage() {
  const [date, setDate] = useState(getInitialDate())
  const [orders, setOrders] = useState<AssignOrder[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)

  const loadOrders = () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('date', date)
    params.set('type', 'all')
    fetch(`/api/admin/delivery?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setOrders(d.orders || [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  useEffect(() => {
    fetch('/api/admin/drivers?activeOnly=true')
      .then((r) => r.json())
      .then((d) => setDrivers(d.drivers || []))
  }, [])

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('date', date)
    window.history.replaceState({}, '', url.toString())
  }, [date])

  const shiftDate = (days: number) => {
    const [y, m, d] = date.split('-').map(Number)
    const next = new Date(y, m - 1, d + days)
    setDate(toDateInputValue(next))
  }

  const assignDriver = async (orderId: string, field: 'driverId' | 'pickupDriverId', value: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, [field]: value || null } : o))
    )
    await fetch('/api/admin/delivery', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, [field]: value || null }),
    })
  }

  const moveRoute = async (
    orderId: string,
    field: 'routeSequence' | 'pickupRouteSequence',
    direction: -1 | 1
  ) => {
    const current = orders.find((o) => o.id === orderId)
    if (!current) return
    const driverField = field === 'routeSequence' ? 'driverId' : 'pickupDriverId'
    const driverId = current[driverField]
    const list = orders
      .filter((o) => o[driverField] === driverId)
      .sort((a, b) => (a[field] ?? 999) - (b[field] ?? 999))
    const idx = list.findIndex((o) => o.id === orderId)
    const swapIdx = idx + direction
    if (swapIdx < 0 || swapIdx >= list.length) return
    const a = list[idx]
    const b = list[swapIdx]
    const aSeq = idx + 1
    const bSeq = swapIdx + 1
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === a.id) return { ...o, [field]: bSeq }
        if (o.id === b.id) return { ...o, [field]: aSeq }
        return o
      })
    )
    await fetch('/api/admin/delivery', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: a.id, [field]: bSeq }),
    })
    await fetch('/api/admin/delivery', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: b.id, [field]: aSeq }),
    })
    loadOrders()
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold text-dark">Assign Drivers</h1>
        <Link href="/admin/delivery" className="px-3 py-2 border rounded bg-white text-sm">Back to Calendar</Link>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        {loading ? 'Loading...' : `${orders.length} order(s) scheduled for this date`}
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button onClick={() => shiftDate(-1)} className="px-3 py-2 border rounded bg-white text-sm">Prev</button>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded px-3 py-2 text-sm" />
        <button onClick={() => shiftDate(1)} className="px-3 py-2 border rounded bg-white text-sm">Next</button>
        <button onClick={() => setDate(toDateInputValue(new Date()))} className="px-3 py-2 border rounded bg-white text-sm">Today</button>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-600 text-white text-left">
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Customer / Address</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Driver</th>
              <th className="px-3 py-2">Pickup Driver</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="px-3 py-2 align-top whitespace-nowrap">{o.eventTimeSlot || '-'}</td>
                <td className="px-3 py-2 align-top whitespace-nowrap">
                  <Link href={`/admin/orders/${o.id}`} className="text-secondary hover:underline font-medium">{o.orderNumber}</Link>
                </td>
                <td className="px-3 py-2 align-top">
                  <div className="font-medium">{o.customer.firstName} {o.customer.lastName}</div>
                  <div className="text-xs text-gray-500">{o.eventAddress}{o.eventCity ? `, ${o.eventCity}` : ''} {o.eventState} {o.eventZip}</div>
                </td>
                <td className="px-3 py-2 align-top">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${o.deliveryType === 'delivery' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {o.deliveryType === 'delivery' ? 'Delivery' : 'Pickup'}
                  </span>
                </td>
                <td className="px-3 py-2 align-top">
                  <div className="flex items-center gap-1">
                    <select value={o.driverId || ''} onChange={(e) => assignDriver(o.id, 'driverId', e.target.value)} className="border rounded px-2 py-1 text-xs">
                      <option value="">Unassigned</option>
                      {drivers.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                    </select>
                    <button onClick={() => moveRoute(o.id, 'routeSequence', -1)} className="text-xs px-1 border rounded" title="Move earlier in route">Up</button>
                    <button onClick={() => moveRoute(o.id, 'routeSequence', 1)} className="text-xs px-1 border rounded" title="Move later in route">Down</button>
                    {o.routeSequence != null && (<span className="text-xs text-gray-400">#{o.routeSequence}</span>)}
                  </div>
                </td>
                <td className="px-3 py-2 align-top">
                  <div className="flex items-center gap-1">
                    <select value={o.pickupDriverId || ''} onChange={(e) => assignDriver(o.id, 'pickupDriverId', e.target.value)} className="border rounded px-2 py-1 text-xs">
                      <option value="">Unassigned</option>
                      {drivers.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                    </select>
                    <button onClick={() => moveRoute(o.id, 'pickupRouteSequence', -1)} className="text-xs px-1 border rounded" title="Move earlier in route">Up</button>
                    <button onClick={() => moveRoute(o.id, 'pickupRouteSequence', 1)} className="text-xs px-1 border rounded" title="Move later in route">Down</button>
                    {o.pickupRouteSequence != null && (<span className="text-xs text-gray-400">#{o.pickupRouteSequence}</span>)}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-400">No orders scheduled for this date.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
