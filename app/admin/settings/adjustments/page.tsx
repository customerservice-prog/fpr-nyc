'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface Adjustment {
id: string
name: string
type: string
value: number
appliesTo: string
isActive: boolean
sortOrder: number
}

export default function AdjustmentsPage() {
const [adjustments, setAdjustments] = useState<Adjustment[]>([])
const [name, setName] = useState('')
const [type, setType] = useState('Percent')
const [value, setValue] = useState('')
const [appliesTo, setAppliesTo] = useState('Order')

const load = () => {
fetch('/api/admin/adjustments')
.then((r) => r.json())
.then((d) => setAdjustments(d.adjustments || []))
}

useEffect(() => {
load()
}, [])

const addAdjustment = async () => {
if (!name) {
toast.error('Name is required')
return
}
const res = await fetch('/api/admin/adjustments', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ name, type, value, appliesTo, sortOrder: adjustments.length }),
})
if (res.ok) {
toast.success('Adjustment added')
setName('')
setValue('')
load()
} else {
toast.error('Failed to add adjustment')
}
}

const updateAdjustment = async (id: string, field: keyof Adjustment, val: string | boolean) => {
setAdjustments((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: val } : a)))
await fetch('/api/admin/adjustments', {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ id, [field]: val }),
})
}

const deleteAdjustment = async (id: string) => {
const res = await fetch(`/api/admin/adjustments?id=${id}`, { method: 'DELETE' })
if (res.ok) {
toast.success('Adjustment removed')
load()
} else {
toast.error('Failed to remove adjustment')
}
}

return (
<div className="p-6 max-w-4xl mx-auto">
<h1 className="text-2xl font-semibold mb-4">Adjustments</h1>
<p className="text-sm text-gray-600 mb-4">
Create surcharges or discounts that can be applied to orders, categories, or items.
</p>

<div className="bg-white border rounded p-4 mb-6 flex flex-wrap gap-2 items-end">
<div>
<label className="block text-xs text-gray-500">Name</label>
<input className="border rounded px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
</div>
<div>
<label className="block text-xs text-gray-500">Type</label>
<select className="border rounded px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
<option value="Percent">Percent</option>
<option value="Flat">Flat</option>
</select>
</div>
<div>
<label className="block text-xs text-gray-500">Value</label>
<input className="border rounded px-3 py-2 text-sm w-24" value={value} onChange={(e) => setValue(e.target.value)} />
</div>
<div>
<label className="block text-xs text-gray-500">Applies To</label>
<select className="border rounded px-3 py-2 text-sm" value={appliesTo} onChange={(e) => setAppliesTo(e.target.value)}>
<option value="Order">Order</option>
<option value="Category">Category</option>
<option value="Item">Item</option>
</select>
</div>
<button className="bg-admin-dark text-white px-4 py-2 rounded text-sm" onClick={addAdjustment}>
Add Adjustment
</button>
</div>

<table className="w-full border-collapse">
<thead>
<tr className="text-left text-xs text-gray-500 border-b">
<th className="py-2">Name</th>
<th className="py-2">Type</th>
<th className="py-2">Value</th>
<th className="py-2">Applies To</th>
<th className="py-2">Active</th>
<th className="py-2"></th>
</tr>
</thead>
<tbody>
{adjustments.map((a) => (
<tr key={a.id} className="border-b">
<td className="py-2">
<input
className="border rounded px-2 py-1 text-sm"
value={a.name}
onChange={(e) => updateAdjustment(a.id, 'name', e.target.value)}
/>
</td>
<td className="py-2">
<select
className="border rounded px-2 py-1 text-sm"
value={a.type}
onChange={(e) => updateAdjustment(a.id, 'type', e.target.value)}
>
<option value="Percent">Percent</option>
<option value="Flat">Flat</option>
</select>
</td>
<td className="py-2">
<input
className="border rounded px-2 py-1 text-sm w-20"
value={a.value}
onChange={(e) => updateAdjustment(a.id, 'value', e.target.value)}
/>
</td>
<td className="py-2">
<select
className="border rounded px-2 py-1 text-sm"
value={a.appliesTo}
onChange={(e) => updateAdjustment(a.id, 'appliesTo', e.target.value)}
>
<option value="Order">Order</option>
<option value="Category">Category</option>
<option value="Item">Item</option>
</select>
</td>
<td className="py-2">
<input
type="checkbox"
checked={a.isActive}
onChange={(e) => updateAdjustment(a.id, 'isActive', e.target.checked)}
/>
</td>
<td className="py-2">
<button className="text-red-600 text-sm" onClick={() => deleteAdjustment(a.id)}>
Delete
</button>
</td>
</tr>
))}
</tbody>
</table>
</div>
)
}
