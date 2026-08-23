'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface Tmpl {
id: string
name: string
content: string
isActive: boolean
}

export default function TextMessageTemplatesPage() {
const [items, setItems] = useState<Tmpl[]>([])
const [name, setName] = useState('')
const [content, setContent] = useState('')
const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const res = await fetch('/api/admin/text-message-templates')
      const data = await res.json()
      setItems(data.items || [])
    } catch {
      toast.error('Failed to load templates')
    } finally {
      setLoading(false)
    }
}

useEffect(() => { load() }, [])

const addItem = async () => {
if (!name || !content) { toast.error('Name and content are required'); return }
const res = await fetch('/api/admin/text-message-templates', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ name, content }),
})
if (res.ok) {
toast.success('Template added')
setName(''); setContent('')
load()
} else {
toast.error('Failed to add')
}
}

const toggleActive = async (item: Tmpl) => {
const res = await fetch('/api/admin/text-message-templates', {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
})
if (res.ok) { load() } else { toast.error('Update failed') }
}

const removeItem = async (id: string) => {
const res = await fetch(`/api/admin/text-message-templates?id=${id}`, { method: 'DELETE' })
if (res.ok) { toast.success('Deleted'); load() } else { toast.error('Delete failed') }
}

if (loading) return <div className="p-4">Loading...</div>

return (
<div className="p-4">
<h1 className="text-xl font-bold text-dark mb-4">Text Message Templates</h1>
<div className="bg-white rounded shadow p-4 mb-4">
<input className="border rounded px-3 py-2 text-sm w-full mb-2" placeholder="Template Name" value={name} onChange={e => setName(e.target.value)} />
<textarea className="border rounded px-3 py-2 text-sm w-full mb-2" rows={3} placeholder="Content" value={content} onChange={e => setContent(e.target.value)} />
<button className="bg-admin-dark text-white px-4 py-2 rounded text-sm" onClick={addItem}>Add Template</button>
</div>
<div className="bg-white rounded shadow">
<table className="w-full text-sm">
<thead>
<tr className="border-b text-left">
<th className="p-2">Name</th>
<th className="p-2">Content</th>
<th className="p-2">Active</th>
<th className="p-2">Actions</th>
</tr>
</thead>
<tbody>
{items.map(item => (
<tr key={item.id} className="border-b">
<td className="p-2">{item.name}</td>
<td className="p-2">{item.content}</td>
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
