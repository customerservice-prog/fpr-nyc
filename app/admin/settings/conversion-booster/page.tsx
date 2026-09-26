'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface Booster {
id: string
name: string
type: string
content: string | null
triggerRule: string | null
isActive: boolean
}

export default function ConversionBoosterPage() {
const [items, setItems] = useState<Booster[]>([])
const [name, setName] = useState('')
const [type, setType] = useState('popup')
const [content, setContent] = useState('')
const [triggerRule, setTriggerRule] = useState('')
const [loading, setLoading] = useState(true)

const load = async () => {
const res = await fetch('/api/admin/conversion-booster')
const data = await res.json()
setItems(data.items || [])
setLoading(false)
}

useEffect(() => { load() }, [])

const addItem = async () => {
if (!name) { toast.error('Name is required'); return }
const res = await fetch('/api/admin/conversion-booster', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ name, type, content, triggerRule }),
})
if (res.ok) {
toast.success('Booster added (disabled by default)')
setName(''); setContent(''); setTriggerRule('')
load()
} else {
toast.error('Failed to add')
}
}

const toggleActive = async (item: Booster) => {
const res = await fetch('/api/admin/conversion-booster', {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
})
if (res.ok) { load() } else { toast.error('Update failed') }
}

const removeItem = async (id: string) => {
const res = await fetch(`/api/admin/conversion-booster?id=${id}`, { method: 'DELETE' })
if (res.ok) { toast.success('Deleted'); load() } else { toast.error('Delete failed') }
}

if (loading) return <div className="p-4">Loading...</div>

return (
<div className="p-4">
<h1 className="text-xl font-bold text-dark mb-4">Conversion Booster</h1>
<div className="bg-white rounded shadow p-4 mb-4">
<div className="grid md:grid-cols-2 gap-2 mb-2">
<input className="border rounded px-3 py-2 text-sm" placeholder="Booster Name" value={name} onChange={e => setName(e.target.value)} />
<select className="border rounded px-3 py-2 text-sm" value={type} onChange={e => setType(e.target.value)}>
<option value="popup">Popup</option>
<option value="banner">Banner</option>
<option value="exit-intent">Exit Intent</option>
</select>
</div>
<textarea className="border rounded px-3 py-2 text-sm w-full mb-2" rows={3} placeholder="Content" value={content} onChange={e => setContent(e.target.value)} />
<input className="border rounded px-3 py-2 text-sm w-full mb-2" placeholder="Trigger Rule" value={triggerRule} onChange={e => setTriggerRule(e.target.value)} />
<button className="bg-admin-dark text-white px-4 py-2 rounded text-sm" onClick={addItem}>Add Booster</button>
</div>
<div className="bg-white rounded shadow">
<table className="w-full text-sm">
<thead>
<tr className="border-b text-left">
<th className="p-2">Name</th>
<th className="p-2">Type</th>
<th className="p-2">Active</th>
<th className="p-2">Actions</th>
</tr>
</thead>
<tbody>
{items.map(item => (
<tr key={item.id} className="border-b">
<td className="p-2">{item.name}</td>
<td className="p-2">{item.type}</td>
<td className="p-2"><input type="checkbox" checked={item.isActive} onChange={() => toggleActive(item)} /></td>
<td className="p-2"><button className="text-red-600 text-xs" onClick={() => removeItem(item.id)}>Delete</button></td>
</tr>
))}
</tbody>
</table>
</div>
</div>
)
}
