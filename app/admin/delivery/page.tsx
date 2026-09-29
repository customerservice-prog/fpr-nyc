'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { NYC_PUBLIC_ORIGIN } from '@/lib/nycPublicOrigin'

function formatFallbackTime(eventDate: string | null | undefined): string | null {
if (!eventDate) return null
const d = new Date(eventDate)
const h = d.getUTCHours()
const m = d.getUTCMinutes()
if (h === 0 && m === 0) return null
const period = h >= 12 ? 'PM' : 'AM'
const h12 = h % 12 === 0 ? 12 : h % 12
const mm = m.toString().padStart(2, '0')
return h12 + ':' + mm + ' ' + period
}

function formatActualTime(iso: string | null | undefined): string | null {
if (!iso) return null
return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatTimeSlot(slot: string | null | undefined): string | null {
if (!slot) return null
const m = /^exact_(\d{1,2})(\d{2})$/.exec(slot)
if (m) {
let h = parseInt(m[1], 10)
const mm = m[2]
const period = h >= 12 ? 'PM' : 'AM'
let h12 = h % 12
if (h12 === 0) h12 = 12
return h12 + ':' + mm + ' ' + period + ' (Exact Time)'
}
return slot
}

interface Driver {
id: string
name: string
}

interface DeliveryOrder {
id: string
orderNumber: string
status: string
deliveryType: string
eventDate: string
eventTimeSlot?: string
  pickupTimeSlot?: string
eventAddress?: string
eventCity?: string
eventState?: string
eventZip?: string
balanceDue: number; amountPaid: number
totalAmount: number
driverId: string | null
driverName: string | null
pickupDriverId: string | null
pickupDriverName: string | null
routeSequence: number | null
pickupRouteSequence: number | null
deliveredAt: string | null
pickedUpAt: string | null
eventEndDate: string | null
notes: string | null
contractSignedAt: string | null
setupSurface: string | null
isPublicPark: boolean
customer: { firstName: string; lastName: string; phone?: string }; dayOfContact?: { name: string; phone?: string | null; note?: string | null } | null
items: Array<{ itemName: string; quantity: number }>
}

interface CalendarDay {
date: string
deliveryCount: number
pickupCount: number
}

interface CustomerSearchResult {
id: string
firstName: string
lastName: string
email: string
phone?: string
lastOrderDate: string | null
}

function toDateInputValue(d: Date) {
const yyyy = d.getFullYear()
const mm = String(d.getMonth() + 1).padStart(2, '0')
const dd = String(d.getDate()).padStart(2, '0')
return yyyy + '-' + mm + '-' + dd
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const WEEKDAY_LABELS = ['S','M','T','W','T','F','S']

function SearchPanel({ onClose }: { onClose: () => void }) {
const [q, setQ] = useState('')
const [results, setResults] = useState<CustomerSearchResult[]>([])
const [loading, setLoading] = useState(false)
const [searched, setSearched] = useState(false)

const runSearch = async () => {
if (!q.trim()) return
setLoading(true)
setSearched(true)
try {
const res = await fetch('/api/admin/customers?search=' + encodeURIComponent(q.trim()) + '&pageSize=8')
const data = await res.json()
setResults(data.customers || [])
} catch {
setResults([])
} finally {
setLoading(false)
}
}

return (
<div className="fixed inset-0 bg-black/40 flex items-start justify-center pt-24 z-50" onClick={onClose}>
<div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
<div className="flex justify-between items-center mb-3">
<h2 className="text-lg font-semibold text-dark">Search Orders / Customers</h2>
<button onClick={onClose} className="text-gray-500 hover:text-gray-700">&times;</button>
</div>
<div className="flex gap-2 mb-3">
<input
autoFocus
type="text"
value={q}
onChange={(e) => setQ(e.target.value)}
onKeyDown={(e) => { if (e.key === 'Enter') runSearch() }}
placeholder="Name, email, phone, or order #"
className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
/>
<button onClick={runSearch} className="btn-admin text-sm">Search</button>
</div>
{loading && <p className="text-sm text-body">Searching...</p>}
{!loading && searched && results.length === 0 && (
<p className="text-sm text-body">No matches found.</p>
)}
<div className="space-y-2 max-h-80 overflow-y-auto">
{results.map((c) => (
<Link
key={c.id}
href={'/admin/customers/' + c.id}
className="block border border-gray-200 rounded-lg p-3 hover:bg-blue-50/40 hover:border-gray-300 transition-colors"
>
<p className="font-medium text-secondary">{c.firstName} {c.lastName}</p>
<p className="text-xs text-body">{c.email}{c.phone ? (' · ' + c.phone) : ''}</p>
{c.lastOrderDate && (
<p className="text-xs text-gray-400 mt-1">
Last Order: {new Date(c.lastOrderDate).toLocaleDateString()}
</p>
)}
</Link>
))}
</div>
</div>
</div>
)
}

export default function DeliveryPage() {
const [view, setView] = useState<'calendar' | 'day'>('calendar')
const [date, setDate] = useState(toDateInputValue(new Date()))
const [type, setType] = useState<'all' | 'delivery' | 'pickup'>('all')
const [statusFilter, setStatusFilter] = useState('active')
const [orders, setOrders] = useState<DeliveryOrder[]>([])
  const [pickupOrders, setPickupOrders] = useState<DeliveryOrder[]>([])
const [drivers, setDrivers] = useState<Driver[]>([])
const [deliveryCount, setDeliveryCount] = useState(0)
const [pickupCount, setPickupCount] = useState(0)
const [loading, setLoading] = useState(true)
const [showSearch, setShowSearch] = useState(false)

const today = new Date()
const [calMonth, setCalMonth] = useState(today.getMonth())
const [calYear, setCalYear] = useState(today.getFullYear())
const [calDays, setCalDays] = useState<CalendarDay[]>([])
const [closedDates, setClosedDates] = useState<string[]>([])
const [calLoading, setCalLoading] = useState(true)

const loadOrders = () => {
setLoading(true)
const params = new URLSearchParams()
params.set('date', date)
params.set('type', type)
if (statusFilter.startsWith('driver_')) {
params.set('status', 'all')
params.set('driverId', statusFilter.slice(7))
} else {
params.set('status', statusFilter)
}
fetch('/api/admin/delivery?' + params.toString())
.then((r) => r.json())
.then((d) => {
setOrders(d.orders || [])
setDeliveryCount(d.deliveryCount || 0)
setPickupCount(d.pickupCount || 0)
  setPickupOrders(d.pickups || [])
})
.finally(() => setLoading(false))
}

const loadCalendar = () => {
setCalLoading(true)
const params = new URLSearchParams()
params.set('month', String(calMonth))
params.set('year', String(calYear))
fetch('/api/admin/delivery/calendar?' + params.toString())
.then((r) => r.json())
.then((d) => {
setCalDays(d.days || [])
setClosedDates(d.closedDates || [])
})
.finally(() => setCalLoading(false))
}

useEffect(() => {
if (view === 'day') loadOrders()
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [date, type, statusFilter, view])

useEffect(() => {
if (view === 'calendar') loadCalendar()
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [calMonth, calYear, view])

useEffect(() => {
fetch('/api/admin/drivers?activeOnly=true')
.then((r) => r.json())
.then((d) => setDrivers(d.drivers || []))
}, [])

const shiftDate = (days: number) => {
const [y, m, d] = date.split('-').map(Number)
const next = new Date(y, m - 1, d + days)
setDate(toDateInputValue(next))
}

const shiftMonth = (delta: number) => {
let m = calMonth + delta
let y = calYear
if (m < 0) { m = 11; y -= 1 }
if (m > 11) { m = 0; y += 1 }
setCalMonth(m)
setCalYear(y)
}

const openDay = (dateKey: string) => {
setDate(dateKey)
setView('day')
}

const markStatus = async (orderId: string, field: 'deliveredAt' | 'pickedUpAt', value: string | null) => { setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, [field]: value } : o))); setPickupOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, [field]: value } : o))); await fetch('/api/admin/delivery', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, [field]: value }) }) }; const assignDriver = async (orderId: string, field: 'driverId' | 'pickupDriverId', value: string) => {
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

const firstOfMonth = new Date(calYear, calMonth, 1)
const startWeekday = firstOfMonth.getDay()
const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
const calByDate: Record<string, CalendarDay> = {}
calDays.forEach((d) => { calByDate[d.date] = d })
const cells: Array<{ day: number; dateKey: string } | null> = []
for (let i = 0; i < startWeekday; i++) cells.push(null)
for (let day = 1; day <= daysInMonth; day++) {
const mm = String(calMonth + 1).padStart(2, '0')
const dd = String(day).padStart(2, '0')
cells.push({ day, dateKey: calYear + '-' + mm + '-' + dd })
}

if (view === 'calendar') {
return (
<div className="p-4 max-w-6xl mx-auto">
{showSearch && <SearchPanel onClose={() => setShowSearch(false)} />}
<h1 className="text-2xl font-bold text-dark mb-1">Delivery Schedule</h1>
<p className="text-sm text-body mb-4">Click a day to view and manage its deliveries and pickups.</p>

<div className="admin-card border-l-4 border-secondary flex flex-col sm:flex-row items-center gap-4">
<img
src={'https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=' + encodeURIComponent(NYC_PUBLIC_ORIGIN + '/driver')}
alt="Driver App QR Code"
width={140}
height={140}
/>
<div>
<h2 className="font-semibold text-dark mb-1">Driver App</h2>
<p className="text-sm text-body mb-2">
Have drivers scan this QR code with their phone camera to open the driver app and install it to their home screen. Manage driver names, phone numbers, emails, vehicles, and PINs on the Manage Drivers page.
</p>
<div className="flex gap-3 flex-wrap">
<a href={NYC_PUBLIC_ORIGIN + '/driver'} target="_blank" rel="noopener noreferrer" className="text-secondary text-sm hover:underline">
Open Driver App &rarr;
</a>
<Link href="/admin/drivers" className="text-secondary text-sm hover:underline">
Manage Drivers (names, phones, vehicles, PINs) &rarr;
</Link>
</div>
</div>
</div>

<div className="flex flex-wrap gap-2 mb-4">
<Link href="/admin/delivery/assign-drivers" className="btn-outline">Assign Drivers</Link>
<Link href="/admin/delivery/print-contracts" target="_blank" className="btn-outline">Print Contracts</Link>
<Link href="/admin/delivery/print-invoices" target="_blank" className="btn-outline">Print Invoices</Link>
<Link href="/admin/delivery/packing-list" target="_blank" className="btn-outline">Packing List</Link>
<Link href="/admin/delivery/product-status-report" className="btn-outline">Product Status Report</Link>
<Link href="/admin/delivery/product-attention-report" className="btn-outline">Product Attention Report</Link>
<Link href={'/admin/delivery/truck-tracker?date=' + date} className="btn-outline">Truck Tracker</Link>
<Link href="/admin/drivers" className="btn-outline">Manage Drivers</Link>
</div>

<div className="flex items-center gap-3 mb-4 flex-wrap">
<button onClick={() => setShowSearch(true)} className="btn-outline font-semibold">Search &gt;&gt;</button>
<button onClick={() => shiftMonth(-1)} className="btn-outline">Prev</button>
<h2 className="text-lg font-semibold text-dark w-48 text-center">{MONTH_NAMES[calMonth]} {calYear}</h2>
<button onClick={() => shiftMonth(1)} className="btn-outline">Next</button>
<button onClick={() => { setCalMonth(today.getMonth()); setCalYear(today.getFullYear()) }} className="btn-outline">This Month</button>
<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm">
<option value="active">Active - All</option>
<option value="cancelled">Canceled</option>
{drivers.map((d) => (<option key={d.id} value={'driver_' + d.id}>Driver: {d.name}</option>))}
</select>
</div>

<div className="admin-card !p-0 overflow-hidden">
<div className="grid grid-cols-7 gap-px bg-gray-200">
{WEEKDAY_LABELS.map((w, i) => (
<div key={i} className="bg-admin-green text-white text-center text-sm font-semibold py-2">{w}</div>
))}
{cells.map((cell, i) => {
if (!cell) return <div key={i} className="bg-gray-50 min-h-[90px]" />
const info = calByDate[cell.dateKey]
const isClosed = closedDates.includes(cell.dateKey)
const isToday = cell.dateKey === toDateInputValue(today)
return (
<button key={i} onClick={() => openDay(cell.dateKey)} className={'min-h-[90px] p-2 text-left bg-white hover:bg-blue-50 transition-colors ' + (isToday ? 'ring-2 ring-inset ring-blue-400' : '')}>
<div className="text-sm font-medium text-gray-700">{cell.day}</div>
{isClosed && <div className="text-xs font-semibold text-gray-400">closed</div>}
<div className="flex gap-1 mt-1 flex-wrap">
{info && info.deliveryCount > 0 && (
<span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold">{info.deliveryCount}</span>
)}
{info && info.pickupCount > 0 && (
<span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold">{info.pickupCount}</span>
)}
</div>
</button>
)
})}
</div>
</div>

<div className="flex items-center gap-4 mt-3 text-xs text-body">
<span className="flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-green-600 inline-block" /> Delivery</span>
<span className="flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-red-600 inline-block" /> Pickup</span>
</div>

{calLoading && <p className="text-sm text-body mt-3">Loading calendar...</p>}
</div>
)
}

return (
<div className="p-4 max-w-6xl mx-auto">
{showSearch && <SearchPanel onClose={() => setShowSearch(false)} />}
<div className="flex items-center justify-between mb-2">
<h1 className="text-2xl font-bold text-dark">Delivery Schedule</h1>
<button onClick={() => setView('calendar')} className="btn-outline">Back to Calendar</button>
</div>
<p className="text-sm text-body mb-4">
{loading ? 'Loading...' : (deliveryCount + ' delivery(s) - ' + pickupCount + ' pickup(s) - ' + orders.length + ' total')}
</p>

<div className="admin-card border-l-4 border-secondary flex flex-wrap items-center gap-3 !mb-4">
<button onClick={() => setShowSearch(true)} className="btn-outline font-semibold">Search &gt;&gt;</button>
<button onClick={() => shiftDate(-1)} className="btn-outline">Prev</button>
<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm" />
<button onClick={() => shiftDate(1)} className="btn-outline">Next</button>
<button onClick={() => setDate(toDateInputValue(new Date()))} className="btn-outline">Today</button>

<select value={type} onChange={(e) => setType(e.target.value as 'all' | 'delivery' | 'pickup')} className="border border-gray-300 rounded px-3 py-2 text-sm sm:ml-auto">
<option value="all">All</option>
<option value="delivery">Delivery Only</option>
<option value="pickup">Pickup Only</option>
</select>
<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm">
<option value="active">Active - All</option>
<option value="cancelled">Canceled</option>
{drivers.map((d) => (<option key={d.id} value={'driver_' + d.id}>Driver: {d.name}</option>))}
</select>
</div>

<div className="flex flex-wrap gap-2 mb-6">
<Link href={'/admin/delivery/assign-drivers?date=' + date} className="btn-outline">Assign Drivers</Link>
<Link href={'/admin/delivery/print-contracts?date=' + date} target="_blank" className="btn-outline">Print Contracts</Link>
<Link href={'/admin/delivery/print-invoices?date=' + date} target="_blank" className="btn-outline">Print Invoices</Link>
<Link href={'/admin/delivery/packing-list?date=' + date} target="_blank" className="btn-outline">Packing List</Link>
<Link href={'/admin/delivery/product-status-report?date=' + date} className="btn-outline">Product Status Report</Link>
<Link href="/admin/delivery/product-attention-report" className="btn-outline">Product Attention Report</Link>
<Link href={'/admin/delivery/truck-tracker?date=' + date} className="btn-outline">Truck Tracker</Link>
<Link href="/admin/drivers" className="btn-outline">Manage Drivers</Link>
</div>

<div className="space-y-4">
{orders.map((o) => (
<div key={o.id} className={'admin-card border-l-4 !mb-0 ' + ((o.status === 'cancelled' || o.status === 'canceled') ? 'border-gray-400 opacity-75' : o.deliveryType === 'delivery' ? 'border-secondary' : 'border-purple-400')}>
<div className="flex justify-between items-start flex-wrap gap-2">
<div>
<div className="flex items-center gap-2 flex-wrap">
<span className={'badge ' + (o.deliveryType === 'delivery' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700')}>
{o.deliveryType === 'delivery' ? 'Delivery' : 'Customer Pickup'}
</span>
{o.status && (o.status === 'cancelled' || o.status === 'canceled') && (
<span className="badge bg-gray-200 text-gray-600">Canceled</span>
)}
<Link href={'/admin/orders/' + o.id} className="font-medium text-secondary hover:underline">{o.orderNumber}</Link>
{o.contractSignedAt && (<span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: '#9ca3af', color: '#fff' }} title="Contract signed">C</span>)}
{o.deliveryType === 'delivery' && !o.deliveredAt && (<button onClick={() => markStatus(o.id, 'deliveredAt', new Date().toISOString())} className="btn-outline text-xs px-2 py-0.5">Mark Delivered</button>)} {o.deliveryType === 'delivery' && o.deliveredAt && (
<><span className="text-xs font-bold text-green-700">✓ Delivered {formatActualTime(o.deliveredAt)}</span> <button onClick={() => markStatus(o.id, 'deliveredAt', null)} className="text-xs text-gray-400 hover:text-red-600 hover:underline ml-1">(undo)</button></>
)}
{o.deliveryType === 'pickup' && !o.pickedUpAt && (<button onClick={() => markStatus(o.id, 'pickedUpAt', new Date().toISOString())} className="btn-outline text-xs px-2 py-0.5">Mark Picked Up</button>)} {o.deliveryType === 'pickup' && o.pickedUpAt && (
<><span className="text-xs font-bold text-green-700">✓ Picked Up {formatActualTime(o.pickedUpAt)}</span> <button onClick={() => markStatus(o.id, 'pickedUpAt', null)} className="text-xs text-gray-400 hover:text-red-600 hover:underline ml-1">(undo)</button></>
)}
<span className="font-medium">{o.customer.firstName} {o.customer.lastName}</span>
</div>
<p className="text-sm text-body mt-1">
{o.eventAddress}{o.eventCity ? (', ' + o.eventCity) : ''} {o.eventState} {o.eventZip}
</p>
<div className="flex flex-wrap gap-3 mt-2">
<div className="rounded border border-green-200 bg-green-50 px-2 py-1">
<p className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Drop-Off</p>
<p className="text-xs text-dark font-medium">{new Date(o.eventDate).toLocaleDateString()} · {formatTimeSlot(o.eventTimeSlot) || formatFallbackTime(o.eventDate) || 'No time selected'}</p>
</div>
<div className="rounded border border-blue-200 bg-blue-50 px-2 py-1">
<p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">Pickup</p>
<p className="text-xs text-dark font-medium">{o.eventEndDate ? new Date(o.eventEndDate).toLocaleDateString() : 'Same day'}</p>
</div>
{o.eventEndDate && (
<div className="rounded border border-gray-200 bg-gray-50 px-2 py-1">
<p className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">Rental Length</p>
<p className="text-xs text-dark font-medium">{Math.max(1, Math.round((new Date(o.eventEndDate).getTime() - new Date(o.eventDate).getTime()) / 86400000))} Day{Math.max(1, Math.round((new Date(o.eventEndDate).getTime() - new Date(o.eventDate).getTime()) / 86400000)) === 1 ? '' : 's'}</p>
</div>
)}
</div>
{o.notes && (<p className="text-xs bg-yellow-100 text-yellow-900 rounded px-1 py-0.5 mt-1 inline-block">{o.notes}</p>)}
{o.setupSurface && (<p className="text-xs text-body">Surface: {o.setupSurface}</p>)}
{o.isPublicPark && (<p className="text-xs text-red-600 font-semibold">Public Park - generator required</p>)}
{o.customer.phone && <p className="text-sm text-body">{o.customer.phone}</p>}{o.dayOfContact && (<p className="text-xs text-amber-700 font-medium mt-0.5">Day-Of: {o.dayOfContact.name}{o.dayOfContact.phone ? ' - ' + o.dayOfContact.phone : ''}</p>)}
{o.items.length > 0 && (
<p className="text-xs text-body mt-1">{o.items.map((i) => i.itemName + ' x' + i.quantity).join(', ')}</p>
)}
</div>
<div className="text-right">
<p className={'text-sm font-semibold ' + ((o.totalAmount - (o.amountPaid || 0)) > 0.01 ? 'text-red-600' : (o.totalAmount - (o.amountPaid || 0)) < -0.01 ? 'text-green-700' : 'text-green-700')}>
{(o.totalAmount - (o.amountPaid || 0)) > 0.01 ? ('Balance: ' + formatCurrency(o.totalAmount - (o.amountPaid || 0))) : (o.totalAmount - (o.amountPaid || 0)) < -0.01 ? ('Overpaid by ' + formatCurrency(Math.abs(o.totalAmount - (o.amountPaid || 0)))) : 'Paid in Full'}
</p>
<Link href={'/admin/orders/' + o.id} className="btn-outline text-xs mt-1 inline-block">View</Link>
</div>
</div>

<div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-4">
<div className="flex items-center gap-2">
<label className="text-xs text-body">Delivery Driver:</label>
<select value={o.driverId || ''} onChange={(e) => assignDriver(o.id, 'driverId', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-xs">
<option value="">Unassigned</option>
{drivers.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
</select>
<button onClick={() => moveRoute(o.id, 'routeSequence', -1)} className="btn-outline text-xs px-2 py-0.5" title="Move earlier in route">Up</button>
<button onClick={() => moveRoute(o.id, 'routeSequence', 1)} className="btn-outline text-xs px-2 py-0.5" title="Move later in route">Down</button>
{o.routeSequence != null && (<span className="text-xs text-gray-400">Stop #{o.routeSequence}</span>)}
</div>

<div className="flex items-center gap-2">
<label className="text-xs text-body">Pickup Driver:</label>
<select value={o.pickupDriverId || ''} onChange={(e) => assignDriver(o.id, 'pickupDriverId', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-xs">
<option value="">Unassigned</option>
{drivers.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
</select>
<button onClick={() => moveRoute(o.id, 'pickupRouteSequence', -1)} className="btn-outline text-xs px-2 py-0.5" title="Move earlier in route">Up</button>
<button onClick={() => moveRoute(o.id, 'pickupRouteSequence', 1)} className="btn-outline text-xs px-2 py-0.5" title="Move later in route">Down</button>
{o.pickupRouteSequence != null && (<span className="text-xs text-gray-400">Stop #{o.pickupRouteSequence}</span>)}
</div>
</div>
</div>
))}
  {pickupOrders.length > 0 && (
  <div className="mt-6">
  <h2 className="text-lg font-semibold text-dark mb-3">Pickups Due Today</h2>
  <div className="space-y-4">
    {pickupOrders.map((o) => (
    <div key={o.id} className="admin-card border-l-4 border-purple-400 !mb-0">
    <div className="flex justify-between items-start flex-wrap gap-2">
    <div>
    <div className="flex items-center gap-2 flex-wrap">
    <span className="badge bg-purple-100 text-purple-700">Pickup Due</span> {o.pickedUpAt ? (<><span className="text-xs font-bold text-green-700">✓ Picked Up {formatActualTime(o.pickedUpAt)}</span> <button onClick={() => markStatus(o.id, 'pickedUpAt', null)} className="text-xs text-gray-400 hover:text-red-600 hover:underline ml-1">(undo)</button></>) : (<button onClick={() => markStatus(o.id, 'pickedUpAt', new Date().toISOString())} className="btn-outline text-xs px-2 py-0.5">Mark Picked Up</button>)}
    <Link href={'/admin/orders/' + o.id} className="font-medium text-secondary hover:underline">{o.orderNumber}</Link>
    <span className="font-medium">{o.customer.firstName} {o.customer.lastName}</span>
    </div>
    <p className="text-sm text-body mt-1">{o.eventAddress}{o.eventCity ? (', ' + o.eventCity) : ''} {o.eventState} {o.eventZip}</p>
    <p className="text-xs text-body mt-1">Pickup time: {formatTimeSlot(o.pickupTimeSlot) || 'Not specified'}</p>
      {o.customer.phone && <p className="text-sm text-body">{o.customer.phone}</p>}{o.dayOfContact && (<p className="text-xs text-amber-700 font-medium mt-0.5">Day-Of: {o.dayOfContact.name}{o.dayOfContact.phone ? ' - ' + o.dayOfContact.phone : ''}</p>)}
      {o.items.length > 0 && (
      <p className="text-xs text-body mt-1">{o.items.map((i) => i.itemName + ' x' + i.quantity).join(', ')}</p>
    )}
    </div>
    <div className="text-right">
    <label className="text-xs text-body block mb-1">Pickup Driver:</label>
    <select value={o.pickupDriverId || ''} onChange={(e) => assignDriver(o.id, 'pickupDriverId', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-xs">
    <option value="">Unassigned</option>
      {drivers.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
    </select>
    </div>
    </div>
    </div>
    ))}
  </div>
  </div>
  )}
      {!loading && orders.length === 0 && (
<p className="text-body">No {type === 'all' ? 'deliveries or pickups' : type + 's'} scheduled for this date.</p>
)}
</div>
</div>
)
}
