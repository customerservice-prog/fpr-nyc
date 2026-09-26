'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface CompanyType {
id: string
name: string
sortOrder: number
isActive: boolean
}

export default function CompanyTypesPage() {
const [types, setTypes] = useState<CompanyType[]>([])
const [name, setName] = useState('')

const load = () => {
fetch('/api/admin/company-types')
.then((r) => r.json())
.then((d) => setTypes(d.companyTypes || []))
}

useEffect(() => {
load()
}, [])

const addType = async () => {
if (!name) {
toast.error('Name is required')
return
}
const res = await fetch('/api/admin/company-types', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ name, sortOrder: types.length }),
})
if (res.ok) {
toast.success('Company type added')
setName('')
load()
} else {
toast.error('Failed to add')
}
}

const updateType = async (id: string, field: keyof CompanyType, val: string | boolean) => {
setTypes((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: val } : t)))
await fetch('/api/admin/company-types', {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ id, [field]: val }),
})
}

const deleteType = async (id: string) => {
const res = await fetch(`/api/admin/company-types?id=${id}`, { method: 'DELETE' })
if (res.ok) {
toast.success('Company type removed')
load()
} else {
toast.error('Failed to remove')
}
}

return (
<div className="p-6 max-w-3xl mx-auto">
<h1 className="text-2xl font-semibold mb-4">Company Types</h1>
<p className="text-sm text-gray-600 mb-4">
Categories used to classify customer accounts, such as Residential or Corporate.
</p>
<div className="flex gap-2 items-end mb-6">
<div>
<label className="block text-xs text-gray-500">Name</label>
<input className="border rounded px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
</div>
<button className="bg-admin-dark text-white px-4 py-2 rounded text-sm" onClick={addType}>
Add Company Type
</button>
</div>

<table className="w-full border-collapse">
<thead>
<tr className="text-left text-xs text-gray-500 border-b">
<th className="py-2">Name</th>
<th className="py-2">Active</th>
<th className="py-2"></th>
</tr>
</thead>
<tbody>
{types.map((t) => (
<tr key={t.id} className="border-b">
<td className="py-2">
<input className="border rounded px-2 py-1 text-sm" value={t.name} onChange={(e) => updateType(t.id, 'name', e.target.value)} />
</td>
<td className="py-2">
<input type="checkbox" checked={t.isActive} onChange={(e) => updateType(t.id, 'isActive', e.target.checked)} />
</td>
<td className="py-2">
<button className="text-red-600 text-xs" onClick={() => deleteType(t.id)}>
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
