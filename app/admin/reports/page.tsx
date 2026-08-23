'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import RevenueChart from '@/components/admin/RevenueChart'
import BestSellersChart from '@/components/admin/BestSellersChart'
import { REPORT_CATEGORIES } from '@/lib/reportsConfig'

interface Summary {
totalRevenue: number
revenueThisMonth: number
outstandingBalance: number
outstandingOrderCount: number
totalOrders: number
totalCustomers: number
newCustomersThisMonth: number
averageOrderValue: number
upcoming7: number
upcoming30: number; pendingPaymentsCount: number; pendingPaymentsAmount: number
ordersByStatus: Array<{ status: string; count: number }>
ordersByDeliveryType: Array<{ deliveryType: string; count: number }>
balanceDueOrders: Array<{
id: string
orderNumber: string
customerName: string
eventDate: string
totalAmount: number
amountPaid: number
balanceDue: number
}>
}

function money(n: number) {
return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
return (
<div className="admin-card border-l-4 border-secondary !mb-0">
<p className="text-sm text-body">{label}</p>
<p className="text-2xl font-bold text-dark mt-1">{value}</p>
{sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
</div>
)
}

const templates = [
{ name: 'Order Confirmation Email', wired: true },
{ name: 'Balance Reminder Email', wired: true },
{ name: 'Delivery Reminder Email', wired: false },
{ name: 'Pickup Reminder Email', wired: false },
{ name: 'Thank You Email', wired: true },
{ name: 'Quote Follow-up Email', wired: false },
]

export default function ReportsPage() {
const [revenue, setRevenue] = useState<Array<{ month: string; revenue: number }>>([])
const [bestSellers, setBestSellers] = useState<Array<{ name: string; count: number }>>([])
const [summary, setSummary] = useState<Summary | null>(null)
const [loading, setLoading] = useState(true)

useEffect(() => {
fetch('/api/admin/reports/monthly-revenue')
.then((r) => r.json())
.then((d) => setRevenue(d.data || []))
fetch('/api/admin/reports/best-sellers')
.then((r) => r.json())
.then((d) => setBestSellers(d.data || []))
fetch('/api/admin/reports/summary')
.then((r) => r.json())
.then((d) => {
setSummary(d)
setLoading(false)
})
.catch(() => setLoading(false))
}, [])

return (
<div className="p-4 max-w-6xl mx-auto space-y-6">
<div className="flex items-center justify-between flex-wrap gap-3">
<h1 className="text-2xl font-bold text-dark">Reports</h1>
<div className="flex items-center gap-2 flex-wrap"><Link href="/admin/rainchecks" className="btn-admin">Rainchecks &rarr;</Link><Link href="/admin/reports/tax" className="btn-admin">Tax Report (by city, month &amp; year) &rarr;</Link></div>
</div>

{loading && <p className="text-body">Loading report data...</p>}

{summary && (
<>
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
<StatCard label="Total Revenue Collected" value={money(summary.totalRevenue)} />
<StatCard label="Revenue This Month" value={money(summary.revenueThisMonth)} />
<StatCard
label="Outstanding Balance Due"
value={money(summary.outstandingBalance)}
sub={summary.outstandingOrderCount + ' order(s) still owe money'}
/>
<StatCard label="Average Order Value" value={money(summary.averageOrderValue)} />
<StatCard label="Total Orders" value={String(summary.totalOrders)} />
<StatCard label="Total Customers" value={String(summary.totalCustomers)} />
<StatCard label="New Customers This Month" value={String(summary.newCustomersThisMonth)} />
<StatCard
label="Upcoming Bookings"
value={summary.upcoming7 + ' in 7 days'}
sub={summary.upcoming30 + ' in the next 30 days'} /><StatCard label="Pending Stripe Payments" value={String(summary.pendingPaymentsCount)} sub={summary.pendingPaymentsCount > 0 ? money(summary.pendingPaymentsAmount) + ' processing' : 'None currently processing'}
/>
</div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<div className="admin-card border-l-4 border-admin-green !mb-0">
<h2 className="admin-card-header">Orders by Status</h2>
<div className="space-y-2">
{summary.ordersByStatus.map((s) => (
<div key={s.status} className="flex justify-between text-sm border-b border-gray-100 pb-1">
<span className="capitalize">{s.status}</span>
<span className="font-medium">{s.count}</span>
</div>
))}
</div>
</div>
<div className="admin-card border-l-4 border-secondary !mb-0">
<h2 className="admin-card-header">Orders by Delivery Type</h2>
<div className="space-y-2">
{summary.ordersByDeliveryType.map((d) => (
<div key={d.deliveryType} className="flex justify-between text-sm border-b border-gray-100 pb-1">
<span className="capitalize">{d.deliveryType}</span>
<span className="font-medium">{d.count}</span>
</div>
))}
</div>
</div>
</div>

<div className="admin-card border-l-4 border-accent !mb-0">
<h2 className="admin-card-header">
Orders With Outstanding Balance ({summary.balanceDueOrders.length})
</h2>
{summary.balanceDueOrders.length === 0 ? (
<p className="text-sm text-body">No orders currently owe a balance.</p>
) : (
<div className="overflow-x-auto -mx-5 -mb-5">
<table className="w-full text-sm">
<thead>
<tr className="text-left bg-gray-50 border-b border-gray-200">
<th className="py-2.5 px-5 font-semibold text-dark">Order #</th>
<th className="py-2.5 px-3 font-semibold text-dark">Customer</th>
<th className="py-2.5 px-3 font-semibold text-dark">Event Date</th>
<th className="py-2.5 px-3 font-semibold text-dark">Total</th>
<th className="py-2.5 px-3 font-semibold text-dark">Paid</th>
<th className="py-2.5 px-5 font-semibold text-dark">Balance Due</th>
</tr>
</thead>
<tbody>
{summary.balanceDueOrders.map((o, idx) => (
<tr key={o.id} className={'border-b border-gray-100 hover:bg-blue-50/50 transition-colors ' + (idx % 2 === 1 ? 'bg-gray-50/40' : '')}>
<td className="py-2 px-5">
<Link href={'/admin/orders/' + o.id} className="text-secondary hover:underline font-medium">
{o.orderNumber}
</Link>
</td>
<td className="py-2 px-3">{o.customerName}</td>
<td className="py-2 px-3">{new Date(o.eventDate).toLocaleDateString()}</td>
<td className="py-2 px-3">{money(o.totalAmount)}</td>
<td className="py-2 px-3">{money(o.amountPaid)}</td>
<td className="py-2 px-5 font-semibold text-red-600">{money(o.balanceDue)}</td>
</tr>
))}
</tbody>
</table>
</div>
)}
</div>
</>
)}

<div className="admin-card border-l-4 border-admin-gold !mb-0">
<h2 className="admin-card-header">Payments Received (Last 19 Months)</h2>
<RevenueChart data={revenue} />
</div>

<div className="admin-card border-l-4 border-admin-gold !mb-0">
<h2 className="admin-card-header">Best Sellers (Last 60 Days)</h2>
<BestSellersChart data={bestSellers} />
</div>

<div className="space-y-4">
<h2 className="text-xl font-bold text-dark">All Reports</h2>
{REPORT_CATEGORIES.map((cat) => (
<div key={cat.name} className="admin-card border-l-4 border-gray-300 !mb-0">
<h3 className="font-bold text-dark mb-3">{cat.name}</h3>
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
{cat.reports.map((r) => (
<Link
key={r.slug}
href={r.slug === 'tax' ? '/admin/reports/tax' : '/admin/reports/' + r.slug}
className="text-sm text-secondary hover:underline py-1"
title={r.description || ''}
>
{r.title}
</Link>
))}
</div>
</div>
))}
</div>
<div className="bg-white rounded shadow p-6">
<h2 className="font-bold text-dark mb-1">Automatic Email Templates</h2>
<p className="text-sm text-body mb-4">These emails are sent automatically by the system at the appropriate step in the order lifecycle.</p>
<ul className="space-y-2">
{templates.map((t) => (
<li key={t.name} className="flex items-center justify-between border-b py-2 text-sm">
<span>{t.name}</span>
{t.wired ? (
<span className="text-xs text-green-700 bg-green-100 rounded px-2 py-0.5">Active</span>
) : (
<span className="text-xs text-amber-700 bg-amber-100 rounded px-2 py-0.5" title="Not yet connected to live sending logic">Not sending yet</span>
)}
</li>
))}
</ul>
</div>
</div>
)
}
