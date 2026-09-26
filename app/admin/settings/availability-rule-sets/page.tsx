'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface RuleSet {
id: string
name: string
startDate: string | null
endDate: string | null
maxQuantity: number | null
minDaysNotice: number
isActive: boolean
notes: string | null
}

export default function AvailabilityRuleSetsPage() {
const [ruleSets, setRuleSets] = useState<RuleSet[]>([])
const [name, setName] = useState('')
const [minDaysNotice, setMinDaysNotice] = useState('0')
const [maxQuantity, setMaxQuantity] = useState('')
const [notes, setNotes] = useState('')

const load = () => {
fetch('/api/admin/availability-rule-sets')
.then((r) => r.json())
.then((d) => setRuleSets(d.ruleSets || []))
}

useEffect(() => {
load()
}, [])

const addRuleSet = async () => {
if (!name) {
toast.error('Name is required')
return
}
const res = await fetch('/api/admin/availability-rule-sets', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ name, minDaysNotice, maxQuantity, notes }),
})
if (res.ok) {
toast.success('Rule set added')
setName('')
setMinDaysNotice('0')
setMaxQuantity('')
setNotes('')
load()
} else {
toast.error('Failed to add rule set')
}
}

const updateRuleSet = async (id: string, field: keyof RuleSet, val: string | boolean) => {
setRuleSets((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: val } : r)))
await fetch('/api/admin/availability-rule-sets', {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ id, [field]: val }),
})
}

const deleteRuleSet = async (id: string) => {
const res = await fetch(`/api/admin/availability-rule-sets?id=${id}`, { method: 'DELETE' })
if (res.ok) {
toast.success('Rule set removed')
load()
} else {
toast.error('Failed to remove rule set')
}
}

return (
<div className="p-6 max-w-4xl mx-auto">
<h1 className="text-2xl font-semibold mb-4">Availability Rule Sets</h1>
<p className="text-sm text-gray-600 mb-4">
Control booking notice requirements, blackout windows, and quantity limits for availability.
</p>

<div className="bg-white border rounded p-4 mb-6 flex flex-wrap gap-2 items-end">
<div>
<label className="block text-xs text-gray-500">Name</label>
<input className="border rounded px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
</div>
<div>
<label className="block text-xs text-gray-500">Min Days Notice</label>
<input className="border rounded px-3 py-2 text-sm w-28" value={minDaysNotice} onChange={(e) => setMinDaysNotice(e.target.value)} />
</div>
<div>
<label className="block text-xs text-gray-500">Max Quantity</label>
<input className="border rounded px-3 py-2 text-sm w-28" value={maxQuantity} onChange={(e) => setMaxQuantity(e.target.value)} placeholder="Unlimited" />
</div>
<div>
<label className="block text-xs text-gray-500">Notes</label>
<input className="border rounded px-3 py-2 text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} />
</div>
<button className="bg-admin-dark text-white px-4 py-2 rounded text-sm" onClick={addRuleSet}>
Add Rule Set
</button>
</div>

<table className="w-full border-collapse">
<thead>
<tr className="text-left text-xs text-gray-500 border-b">
<th className="py-2">Name</th>
<th className="py-2">Min Days Notice</th>
<th className="py-2">Max Qty</th>
<th className="py-2">Notes</th>
<th className="py-2">Active</th>
<th className="py-2"></th>
</tr>
</thead>
<tbody>
{ruleSets.map((r) => (
<tr key={r.id} className="border-b">
<td className="py-2">
<input
className="border rounded px-2 py-1 text-sm"
value={r.name}
onChange={(e) => updateRuleSet(r.id, 'name', e.target.value)}
/>
</td>
<td className="py-2">
<input
className="border rounded px-2 py-1 text-sm w-20"
value={r.minDaysNotice}
onChange={(e) => updateRuleSet(r.id, 'minDaysNotice', e.target.value)}
/>
</td>
<td className="py-2">
<input
className="border rounded px-2 py-1 text-sm w-20"
value={r.maxQuantity ?? ''}
onChange={(e) => updateRuleSet(r.id, 'maxQuantity', e.target.value)}
/>
</td>
<td className="py-2">
<input
className="border rounded px-2 py-1 text-sm"
value={r.notes ?? ''}
onChange={(e) => updateRuleSet(r.id, 'notes', e.target.value)}
/>
</td>
<td className="py-2">
<input
type="checkbox"
checked={r.isActive}
onChange={(e) => updateRuleSet(r.id, 'isActive', e.target.checked)}
/>
</td>
<td className="py-2">
<button className="text-red-600 text-sm" onClick={() => deleteRuleSet(r.id)}>
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
