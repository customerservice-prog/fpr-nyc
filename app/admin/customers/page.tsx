'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Customer {
id: string
firstName: string
lastName: string
email: string
phone?: string
doNotRent?: boolean
  restrictionStatus?: 'RESTRICTED' | 'ADDRESS_RESTRICTED' | null
orderCount: number
totalSpent: number
balanceDue: number
lastOrderDate?: string
}

const PAGE_SIZE = 50

export default function CustomersPage() {
const [customers, setCustomers] = useState<Customer[]>([])
const [total, setTotal] = useState(0)
const [search, setSearch] = useState('')
const [debouncedSearch, setDebouncedSearch] = useState('')
const [page, setPage] = useState(1)
const [loading, setLoading] = useState(true)
const requestId = useRef(0)

useEffect(() => {
const t = setTimeout(() => setDebouncedSearch(search.trim()), 250)
return () => clearTimeout(t)
}, [search])

useEffect(() => {
setPage(1)
}, [debouncedSearch])

useEffect(() => {
const thisRequest = ++requestId.current
setLoading(true)
const params = new URLSearchParams()
if (debouncedSearch) params.set('search', debouncedSearch)
params.set('page', String(page))
params.set('pageSize', String(PAGE_SIZE))
fetch('/api/admin/customers?' + params.toString())
.then((r) => r.json())
.then((d) => {
if (thisRequest !== requestId.current) return
setCustomers(d.customers || [])
setTotal(d.total || 0)
})
.finally(() => {
if (thisRequest === requestId.current) setLoading(false)
})
}, [debouncedSearch, page])

const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

return (
<div className="p-4 max-w-6xl mx-auto">
<div className="flex items-center justify-between mb-6">
<div>
<h1 className="text-2xl font-bold text-dark">Customers</h1>
<p className="text-sm text-body">{total} customer(s)</p>
</div>
</div>

<div className="admin-card border-l-4 border-secondary">
<input
type="search"
placeholder="Search by name, email, phone, or order #..."
value={search}
onChange={(e) => setSearch(e.target.value)}
className="border border-gray-300 rounded px-3 py-2 text-sm w-full max-w-md"
/>
</div>

<div className="admin-card !p-0 overflow-hidden">
<div className="overflow-x-auto">
<table className="w-full text-sm">
<thead>
<tr className="bg-gray-50 border-b border-gray-200">
<th className="px-4 py-3 text-left font-semibold text-dark">Name</th>
<th className="px-4 py-3 text-left font-semibold text-dark">Email</th>
<th className="px-4 py-3 text-left font-semibold text-dark">Phone</th>
<th className="px-4 py-3 text-right font-semibold text-dark"># Orders</th>
<th className="px-4 py-3 text-right font-semibold text-dark">Total Paid</th>
<th className="px-4 py-3 text-right font-semibold text-dark">Balance Due</th>
<th className="px-4 py-3 text-left font-semibold text-dark">Last Order</th>
</tr>
</thead>
<tbody>
{customers.map((c, idx) => (
<tr key={c.id} className={'border-b border-gray-100 hover:bg-blue-50/50 transition-colors ' + (idx % 2 === 1 ? 'bg-gray-50/40' : '')}>
<td className="px-4 py-3">
<Link href={'/admin/customers/' + c.id} className="text-secondary hover:underline font-medium">
{c.firstName} {c.lastName}
</Link>
  {c.restrictionStatus === 'RESTRICTED' && <span className="ml-2 inline-block px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">Do Not Rent</span>}
  {c.restrictionStatus === 'ADDRESS_RESTRICTED' && <span className="ml-2 inline-block px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700">Restricted Address</span>}
</td>
<td className="px-4 py-3">{c.email && c.email.includes('@imported.friendlypartyrental.local') ? <span className="text-amber-600 italic text-xs" title="Placeholder email imported from ERS — needs a real email on file">⚠ Missing email</span> : c.email}</td>
<td className="px-4 py-3">{c.phone || '-'}</td>
<td className="px-4 py-3 text-right">{c.orderCount}</td>
<td className="px-4 py-3 text-right">{formatCurrency(c.totalSpent)}</td>
<td className={'px-4 py-3 text-right ' + (c.balanceDue > 0 ? 'text-red-600 font-semibold' : '')}>
{formatCurrency(c.balanceDue)}
</td>
<td className="px-4 py-3">{c.lastOrderDate ? formatDate(c.lastOrderDate) : '-'}</td>
</tr>
))}
{customers.length === 0 && !loading && (
<tr>
<td colSpan={7} className="px-4 py-6 text-center text-body">
No customers found.
</td>
</tr>
)}
</tbody>
</table>
</div>
</div>
{totalPages > 1 && (
<div className="flex items-center justify-between mt-2 text-sm">
<button
onClick={() => setPage((p) => Math.max(1, p - 1))}
disabled={page <= 1}
className="btn-outline disabled:opacity-40"
>
Previous
</button>
<span className="text-body">
Page {page} of {totalPages}
</span>
<button
onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
disabled={page >= totalPages}
className="btn-outline disabled:opacity-40"
>
Next
</button>
</div>
)}
</div>
)
}
