'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Order {
id: string
orderNumber: string
status: string
eventDate: string
totalAmount: number
amountPaid: number
balanceDue: number
customer: { firstName: string; lastName: string }
}

export default function OrdersPage() {
const [orders, setOrders] = useState<Order[]>([])
const [statusFilter, setStatusFilter] = useState('')
const [search, setSearch] = useState('')

useEffect(() => {
    let cancelled = false
const params = new URLSearchParams()
if (statusFilter) params.set('status', statusFilter)
if (search) params.set('search', search)
fetch('/api/admin/orders?' + params)
.then((r) => r.json())
.then((d) => { if (!cancelled) setOrders(d.orders || []) })
.catch(() => {})
return () => { cancelled = true }
  }, [statusFilter, search])

const statusBadgeClass = (status: string) => {
if (status === 'active') return 'badge badge-active'
if (status === 'quote') return 'badge badge-quote'
if (status === 'canceled') return 'badge badge-canceled'
if (status === 'completed') return 'badge badge-completed'
return 'badge badge-incomplete'
}

return (
<div className="p-4 max-w-6xl mx-auto">
<div className="flex items-center justify-between mb-6">
<h1 className="text-2xl font-bold text-dark">Orders</h1>
<Link href="/admin/orders/new" className="btn-admin">+ New Order</Link>
</div>

<div className="admin-card border-l-4 border-secondary flex flex-wrap gap-4 items-end">
<div>
<label className="block text-xs text-body mb-1">Status</label>
<select
value={statusFilter}
onChange={(e) => setStatusFilter(e.target.value)}
className="border border-gray-300 rounded px-3 py-2 text-sm"
>
<option value="">All Statuses</option>
<option value="active">Active</option>
<option value="incomplete">Incomplete</option>
<option value="quote">Quote</option>
<option value="canceled">Canceled</option>
<option value="completed">Completed</option>
</select>
</div>
<div className="flex-1 min-w-[200px]">
<label className="block text-xs text-body mb-1">Search</label>
<input
type="search"
placeholder="Search by customer name or order number..."
value={search}
onChange={(e) => setSearch(e.target.value)}
className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
/>
</div>
</div>

<div className="admin-card !p-0 overflow-hidden">
<div className="overflow-x-auto">
<table className="w-full text-sm">
<thead>
<tr className="bg-gray-50 border-b border-gray-200">
<th className="px-4 py-3 text-left font-semibold text-dark">Order#</th>
<th className="px-4 py-3 text-left font-semibold text-dark">Customer</th>
<th className="px-4 py-3 text-left font-semibold text-dark">Event Date</th>
<th className="px-4 py-3 text-left font-semibold text-dark">Status</th>
<th className="px-4 py-3 text-right font-semibold text-dark">Total</th>
<th className="px-4 py-3 text-right font-semibold text-dark">Paid</th>
<th className="px-4 py-3 text-right font-semibold text-dark">Balance</th>
<th className="px-4 py-3 text-left font-semibold text-dark">Actions</th>
</tr>
</thead>
<tbody>
{orders.map((order, idx) => (
<tr key={order.id} className={'border-b border-gray-100 hover:bg-blue-50/50 transition-colors ' + (idx % 2 === 1 ? 'bg-gray-50/40' : '')}>
<td className="px-4 py-3 font-medium">{order.orderNumber}</td>
<td className="px-4 py-3">{order.customer.firstName} {order.customer.lastName}</td>
<td className="px-4 py-3">{formatDate(order.eventDate)}</td>
<td className="px-4 py-3">
<span className={statusBadgeClass(order.status)}>{order.status}</span>
</td>
<td className="px-4 py-3 text-right">{formatCurrency(order.totalAmount)}</td>
<td className="px-4 py-3 text-right">{formatCurrency(order.amountPaid)}</td>
<td className={'px-4 py-3 text-right ' + (order.balanceDue > 0.01 ? 'text-red-600 font-medium' : '')}>{formatCurrency(order.balanceDue)}</td>
<td className="px-4 py-3">
<Link href={'/admin/orders/' + order.id} className="btn-outline text-xs px-3 py-1">View</Link>
</td>
</tr>
))}
{orders.length === 0 && (
<tr><td colSpan={8} className="px-4 py-8 text-center text-body">No orders found</td></tr>
)}
</tbody>
</table>
</div>
</div>
</div>
)
}
