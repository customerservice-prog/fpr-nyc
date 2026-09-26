'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface DocItem {
id: string
name: string
fileUrl: string | null
category: string | null
isActive: boolean
}

export default function GeneralDocumentsPage() {
const [items, setItems] = useState<DocItem[]>([])
const [name, setName] = useState('')
const [fileUrl, setFileUrl] = useState('')
const [category, setCategory] = useState('')
const [loading, setLoading] = useState(true)

const load = async () => {
const res = await fetch('/api/admin/general-documents')
const data = await res.json()
setItems(data.items || [])
setLoading(false)
}

useEffect(() => { load() }, [])

const addItem = async () => {
if (!name) { toast.error('Name is required'); return }
const res = await fetch('/api/admin/general-documents', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ name, fileUrl, category }),
})
if (res.ok) {
toast.success('Document added')
setName(''); setFileUrl(''); setCategory('')
load()
} else {
toast.error('Failed to add document')
}
}

const toggleActive = async (item: DocItem) => {
const res = await fetch('/api/admin/general-documents', {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
})
if (res.ok) { load() } else { toast.error('Update failed') }
}

const removeItem = async (id: string) => {
const res = await fetch(`/api/admin/general-documents?id=${id}`, { method: 'DELETE' })
if (res.ok) { toast.success('Deleted'); load() } else { toast.error('Delete failed') }
}

if (loading) return <div className="p-4">Loading...</div>

return (
<div className="p-4">
<h1 className="text-xl font-bold text-dark mb-4">General Documents</h1>
<div className="bg-white rounded shadow p-4 mb-4">
<div className="grid md:grid-cols-3 gap-2 mb-2">
<input className="border rounded px-3 py-2 text-sm" placeholder="Document Name" value={name} onChange={e => setName(e.target.value)} />
<input className="border rounded px-3 py-2 text-sm" placeholder="File URL" value={fileUrl} onChange={e => setFileUrl(e.target.value)} />
<input className="border rounded px-3 py-2 text-sm" placeholder="Category" value={category} onChange={e => setCategory(e.target.value)} />
</div>
<button className="bg-admin-dark text-white px-4 py-2 rounded text-sm" onClick={addItem}>Add Document</button>
</div>
<div className="bg-white rounded shadow">
<table className="w-full text-sm">
<thead>
<tr className="border-b text-left">
<th className="p-2">Name</th>
<th className="p-2">Category</th>
<th className="p-2">File URL</th>
<th className="p-2">Active</th>
<th className="p-2">Actions</th>
</tr>
</thead>
<tbody>
{items.map(item => (
<tr key={item.id} className="border-b">
<td className="p-2">{item.name}</td>
<td className="p-2">{item.category}</td>
<td className="p-2"><a href={item.fileUrl || '#'} className="text-secondary hover:underline" target="_blank" rel="noreferrer">{item.fileUrl}</a></td>
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
