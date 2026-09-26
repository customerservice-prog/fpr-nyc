'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface Img {
id: string
name: string
url: string
category: string | null
isActive: boolean
}

export default function GeneralImagesPage() {
const [items, setItems] = useState<Img[]>([])
const [name, setName] = useState('')
const [url, setUrl] = useState('')
const [category, setCategory] = useState('')
const [loading, setLoading] = useState(true)

const load = async () => {
const res = await fetch('/api/admin/general-images')
const data = await res.json()
setItems(data.items || [])
setLoading(false)
}

useEffect(() => { load() }, [])

const addItem = async () => {
if (!name || !url) { toast.error('Name and URL are required'); return }
const res = await fetch('/api/admin/general-images', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ name, url, category }),
})
if (res.ok) {
toast.success('Image added')
setName(''); setUrl(''); setCategory('')
load()
} else {
toast.error('Failed to add')
}
}

const toggleActive = async (item: Img) => {
const res = await fetch('/api/admin/general-images', {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
})
if (res.ok) { load() } else { toast.error('Update failed') }
}

const removeItem = async (id: string) => {
const res = await fetch(`/api/admin/general-images?id=${id}`, { method: 'DELETE' })
if (res.ok) { toast.success('Deleted'); load() } else { toast.error('Delete failed') }
}

if (loading) return <div className="p-4">Loading...</div>

return (
<div className="p-4">
<h1 className="text-xl font-bold text-dark mb-4">General Images</h1>
<div className="bg-white rounded shadow p-4 mb-4">
<div className="grid md:grid-cols-3 gap-2 mb-2">
<input className="border rounded px-3 py-2 text-sm" placeholder="Image Name" value={name} onChange={e => setName(e.target.value)} />
<input className="border rounded px-3 py-2 text-sm" placeholder="Image URL" value={url} onChange={e => setUrl(e.target.value)} />
<input className="border rounded px-3 py-2 text-sm" placeholder="Category" value={category} onChange={e => setCategory(e.target.value)} />
</div>
<button className="bg-admin-dark text-white px-4 py-2 rounded text-sm" onClick={addItem}>Add Image</button>
</div>
<div className="bg-white rounded shadow">
<table className="w-full text-sm">
<thead>
<tr className="border-b text-left">
<th className="p-2">Name</th>
<th className="p-2">Category</th>
<th className="p-2">Preview</th>
<th className="p-2">Active</th>
<th className="p-2">Actions</th>
</tr>
</thead>
<tbody>
{items.map(item => (
<tr key={item.id} className="border-b">
<td className="p-2">{item.name}</td>
<td className="p-2">{item.category}</td>
<td className="p-2"><img src={item.url} alt={item.name} className="h-10" /></td>
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
