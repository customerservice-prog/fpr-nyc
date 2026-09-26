'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'

interface PrintOrder {
id: string
orderNumber: string
eventDate: string
eventAddress?: string
eventCity?: string
eventState?: string
eventZip?: string
customerName: string
customerPhone?: string
customerEmail?: string
subtotal: number
damageWaiverFee: number
deliveryFee: number
durationFee: number
specialRequestFee: number
taxAmount: number
couponDiscount: number
tipAmount: number
lastMinuteFeeAmount: number
totalAmount: number
amountPaid: number
balanceDue: number
items: Array<{ itemName: string; quantity: number; unitPrice: number; total: number }>
}

export default function PrintInvoicesPage() {
return (
<Suspense fallback={<div className="p-8">Loading...</div>}>
<PrintInvoicesInner />
</Suspense>
)
}

function PrintInvoicesInner() {
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

return (
<div className="p-8 print:p-0">
<div className="mb-6 print:hidden">
<button onClick={() => window.print()} className="btn-admin px-4 py-2">Print All Invoices</button>
</div>
{orders.length === 0 && <p>No orders scheduled for this date.</p>}
{orders.map((order) => (
<div key={order.id} className="max-w-2xl mx-auto mb-12" style={{ pageBreakAfter: 'always' }}>
<div className="text-center mb-6">
<h1 className="text-2xl font-bold text-dark mb-1">Friendly Party Rental</h1>
<p className="text-body text-sm">Greenville, SC and surrounding Upstate South Carolina areas</p>
</div>

<div className="bg-gray-50 p-6 rounded-lg mb-6 space-y-1">
<h2 className="font-bold text-dark mb-2">Invoice</h2>
<p className="text-sm">Order #{order.orderNumber}</p>
<p className="text-sm">Bill To: {order.customerName}</p>
{order.customerPhone && <p className="text-sm">Phone: {order.customerPhone}</p>}
{order.customerEmail && <p className="text-sm">Email: {order.customerEmail}</p>}
<p className="text-sm">Event Date: {formatDate(order.eventDate)}</p>
{order.eventAddress && (
<p className="text-sm">
{order.eventAddress}{order.eventCity ? `, ${order.eventCity}` : ''} {order.eventState} {order.eventZip}
</p>
)}
</div>

<div className="bg-white border rounded-lg p-4 mb-6">
<table className="w-full text-sm">
<thead>
<tr className="text-left border-b">
<th className="pb-2">Item</th>
<th className="pb-2 text-right">Qty</th>
<th className="pb-2 text-right">Price</th>
<th className="pb-2 text-right">Total</th>
</tr>
</thead>
<tbody>
{order.items.map((item, idx) => (
<tr key={idx} className="border-b last:border-0">
<td className="py-2">{item.itemName}</td>
<td className="py-2 text-right">{item.quantity}</td>
<td className="py-2 text-right">{formatCurrency(item.unitPrice)}</td>
<td className="py-2 text-right">{formatCurrency(item.total)}</td>
</tr>
))}
</tbody>
</table>
</div>

<div className="bg-white border rounded-lg p-4 text-sm">
<div className="flex justify-between py-1"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
{order.damageWaiverFee > 0 && (
<div className="flex justify-between py-1"><span>Damage Waiver</span><span>{formatCurrency(order.damageWaiverFee)}</span></div>
)}
{order.deliveryFee > 0 && (
<div className="flex justify-between py-1"><span>Delivery Fee</span><span>{formatCurrency(order.deliveryFee)}</span></div>
)}
{order.durationFee > 0 && (
<div className="flex justify-between py-1"><span>Duration Fee</span><span>{formatCurrency(order.durationFee)}</span></div>
)}
{order.specialRequestFee > 0 && (
<div className="flex justify-between py-1"><span>Special Request Fee</span><span>{formatCurrency(order.specialRequestFee)}</span></div>
)}
{order.lastMinuteFeeAmount > 0 && (
<div className="flex justify-between py-1"><span>Last-Minute Fee</span><span>{formatCurrency(order.lastMinuteFeeAmount)}</span></div>
)}
{order.couponDiscount > 0 && (
<div className="flex justify-between py-1"><span>Discount</span><span>-{formatCurrency(order.couponDiscount)}</span></div>
)}
<div className="flex justify-between py-1"><span>Tax</span><span>{formatCurrency(order.taxAmount)}</span></div>
{order.tipAmount > 0 && (
<div className="flex justify-between py-1"><span>Tip</span><span>{formatCurrency(order.tipAmount)}</span></div>
)}
<div className="flex justify-between py-2 border-t font-semibold"><span>Total</span><span>{formatCurrency(order.totalAmount)}</span></div>
<div className="flex justify-between py-1"><span>Amount Paid</span><span>{formatCurrency(order.amountPaid)}</span></div>
<div className="flex justify-between py-2 border-t font-bold text-base"><span>Balance Due</span><span>{formatCurrency(order.balanceDue)}</span></div>
</div>
</div>
))}
</div>
)
}
