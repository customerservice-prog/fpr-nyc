'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface NavItem {
id: string
label: string
url: string
sortOrder: number
isActive: boolean
}

export default function NavigationEditorPage() {
const [items, setItems] = useState<NavItem[]>([])
const [label, setLabel] = useState('')
const [url, setUrl] = useState('')
const [sortOrder, setSortOrder] = useState(0)
const [loading, setLoading] = useState(true)

const load = async () => {
const res = await fetch('/api/admin/navigation-editor')
const data = await res.json()
setItems(data.items || [])
setLoading(false)
}

useEffect(() => { load() }, [])

const addItem = async () => {
if (!label || !url) { toast.error('Label and URL are required'); return }
const res = await fetch('/api/admin/navigation-editor', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ label, url, sortOrder }),
})
if (res.ok) {
toast.success('Nav item added')
setLabel(''); setUrl(''); setSortOrder(0)
load()
} else {
toast.error('Failed to add')
}
}

const toggleActive = async (item: NavItem) => {
const res = await fetch('/api/admin/navigation-editor', {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
})
if (res.ok) { load() } else { toast.error('Update failed') }
}

const removeItem = async (id: string) => {
const res = await fetch(`/api/admin/navigation-editor?id=${id}`, { method: 'DELETE' })
if (res.ok) { toast.success('Deleted'); load() } else { toast.error('Delete failed') }
}

if (loading) return <div className="p-4">Loading...</div>

return (
<div className="p-4">
<h1 className="text-xl font-bold text-dark mb-4">Navigation Editor</h1>
<div className="bg-white rounded shadow p-4 mb-4">
<div className="grid md:grid-cols-3 gap-2 mb-2">
<input className="border rounded px-3 py-2 text-sm" placeholder="Label" value={label} onChange={e => setLabel(e.target.value)} />
<input className="border rounded px-3 py-2 text-sm" placeholder="URL" value={url} onChange={e => setUrl(e.target.value)} />
<input type="number" className="border rounded px-3 py-2 text-sm" placeholder="Sort Order" value={sortOrder} onChange={e => setSortOrder(parseInt(e.target.value) || 0)} />
</div>
<button className="bg-admin-dark text-white px-4 py-2 rounded text-sm" onClick={addItem}>Add Nav Item</button>
</div>
<div className="bg-white rounded shadow">
<table className="w-full text-sm">
<thead>
<tr className="border-b text-left">
<th className="p-2">Label</th>
<th className="p-2">URL</th>
<th className="p-2">Sort Order</th>
<th className="p-2">Active</th>
<th className="p-2">Actions</th>
</tr>
</thead>
<tbody>
{items.map(item => (
<tr key={item.id} className="border-b">
<td className="p-2">{item.label}</td>
<td className="p-2">{item.url}</td>
<td className="p-2">{item.sortOrder}</td>
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
