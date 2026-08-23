'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

interface PrintOrder {
id: string
orderNumber: string
eventTimeSlot?: string
eventAddress?: string
eventCity?: string
customerName: string
driverName?: string | null
items: Array<{ itemName: string; quantity: number }>
}

export default function PackingListPage() {
return (
<Suspense fallback={<div className="p-8">Loading...</div>}>
<PackingListInner />
</Suspense>
)
}

function PackingListInner() {
const searchParams = useSearchParams()
const date = searchParams.get('date') || ''
const [orders, setOrders] = useState<PrintOrder[]>([])
const [loading, setLoading] = useState(true)

useEffect(() => {
fetch(`/api/admin/delivery/print-data?date=${date}`)
.then((r) => r.json())
.then((d) => setOrders(d.orders || []))
.finally(() => setLoading(false))
}, [date])

if (loading) {
    return <div className="p-8">Loading...</div>
  }

const totals: Record<string, number> = {}
orders.forEach((o) => {
o.items.forEach((i) => {
totals[i.itemName] = (totals[i.itemName] || 0) + i.quantity
})
})
const sortedTotals = Object.entries(totals).sort((a, b) => b[1] - a[1])

return (
<div className="p-8 print:p-0 max-w-3xl mx-auto">
<div className="mb-6 print:hidden">
<button onClick={() => window.print()} className="btn-admin px-4 py-2">Print Packing List</button>
</div>
<div className="text-center mb-8">
<h1 className="text-2xl font-bold text-dark mb-1">Friendly Party Rental</h1>
<p className="text-body text-sm">Packing List for {date}</p>
</div>

<div className="bg-white border rounded-lg p-4 mb-8">
<h2 className="font-bold text-dark mb-3">Total Items Needed Today</h2>
{sortedTotals.length === 0 && <p className="text-gray-400">No orders scheduled for this date.</p>}
<table className="w-full text-sm">
<thead>
<tr className="text-left border-b">
<th className="pb-2">Item</th>
<th className="pb-2 text-right">Total Qty Needed</th>
</tr>
</thead>
<tbody>
{sortedTotals.map(([name, qty]) => (
<tr key={name} className="border-b last:border-0">
<td className="py-2">{name}</td>
<td className="py-2 text-right font-semibold">{qty}</td>
</tr>
))}
</tbody>
</table>
</div>

<div className="bg-white border rounded-lg p-4">
<h2 className="font-bold text-dark mb-3">By Order / Truck</h2>
{orders.map((order) => (
<div key={order.id} className="mb-4 pb-4 border-b last:border-0">
<p className="font-semibold text-sm">
{order.orderNumber} — {order.customerName} {order.eventTimeSlot ? `(${order.eventTimeSlot})` : ''}
</p>
<p className="text-xs text-gray-500 mb-1">
{order.eventAddress}{order.eventCity ? `, ${order.eventCity}` : ''} {order.driverName ? `· Driver: ${order.driverName}` : ''}
</p>
<ul className="text-sm list-disc list-inside">
{order.items.map((item, idx) => (
<li key={idx}>{item.itemName} x{item.quantity}</li>
))}
</ul>
</div>
))}
</div>
</div>
)
}
