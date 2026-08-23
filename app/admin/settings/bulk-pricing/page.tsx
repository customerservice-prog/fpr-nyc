'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface Rule {
id: string
name: string
minQuantity: number
discountType: string
discountValue: number
isActive: boolean
}

export default function BulkPricingPage() {
const [rules, setRules] = useState<Rule[]>([])
const [loading, setLoading] = useState(true)
const [name, setName] = useState('')
const [minQuantity, setMinQuantity] = useState('2')
const [discountType, setDiscountType] = useState('Percent')
const [discountValue, setDiscountValue] = useState('10')

const load = async () => {
const res = await fetch('/api/admin/bulk-pricing')
const data = await res.json()
setRules(data.rules || [])
setLoading(false)
}

useEffect(() => {
load()
}, [])

const addRule = async () => {
if (!name) return toast.error('Name is required')
const res = await fetch('/api/admin/bulk-pricing', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ name, minQuantity, discountType, discountValue }),
})
if (res.ok) {
toast.success('Bulk pricing rule added')
setName('')
setMinQuantity('2')
setDiscountValue('10')
load()
} else {
toast.error('Failed to add rule')
}
}

const toggleActive = async (rule: Rule) => {
const res = await fetch('/api/admin/bulk-pricing', {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ id: rule.id, isActive: !rule.isActive }),
})
if (res.ok) {
toast.success('Updated')
load()
}
}

const remove = async (id: string) => {
const res = await fetch(`/api/admin/bulk-pricing?id=${id}`, { method: 'DELETE' })
if (res.ok) {
toast.success('Deleted')
load()
}
}

if (loading) return <div className="p-6">Loading...</div>

return (
<div className="p-6 max-w-3xl">
<h1 className="text-xl font-bold text-dark mb-4">Bulk Pricing</h1>
<div className="bg-white border rounded p-4 mb-6 space-y-2">
<input
className="border rounded px-3 py-2 text-sm w-full"
placeholder="Rule name"
value={name}
onChange={(e) => setName(e.target.value)}
/>
<div className="flex gap-2">
<input
className="border rounded px-3 py-2 text-sm w-full"
type="number"
placeholder="Minimum quantity"
value={minQuantity}
onChange={(e) => setMinQuantity(e.target.value)}
/>
<select
className="border rounded px-3 py-2 text-sm w-full"
value={discountType}
onChange={(e) => setDiscountType(e.target.value)}
>
<option value="Percent">Percent</option>
<option value="Fixed">Fixed</option>
</select>
<input
className="border rounded px-3 py-2 text-sm w-full"
type="number"
placeholder="Discount value"
value={discountValue}
onChange={(e) => setDiscountValue(e.target.value)}
/>
</div>
<button onClick={addRule} className="bg-admin-dark text-white px-4 py-2 rounded text-sm">
Add Rule
</button>
</div>

<div className="space-y-2">
{rules.map((rule) => (
<div key={rule.id} className="border rounded p-3 flex items-center justify-between bg-white">
<div>
<div className="font-medium">{rule.name}</div>
<div className="text-sm text-gray-500">
{rule.minQuantity}+ items: {rule.discountValue}{rule.discountType === 'Percent' ? '%' : ''} off
</div>
</div>
<div className="flex items-center gap-3">
<label className="flex items-center gap-1 text-sm">
<input
type="checkbox"
checked={rule.isActive}
onChange={() => toggleActive(rule)}
/>
Active
</label>
<button onClick={() => remove(rule.id)} className="text-red-600 text-sm">
Delete
</button>
</div>
</div>
))}
</div>
</div>
)
}
