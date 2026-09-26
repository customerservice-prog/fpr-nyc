'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface Page {
id: string
slug: string
title: string
content: string | null
isPublished: boolean
}

export default function WebsitePagesPage() {
const [items, setItems] = useState<Page[]>([])
const [slug, setSlug] = useState('')
const [title, setTitle] = useState('')
const [content, setContent] = useState('')
const [loading, setLoading] = useState(true)

const load = async () => {
const res = await fetch('/api/admin/website-pages')
const data = await res.json()
setItems(data.items || [])
setLoading(false)
}

useEffect(() => { load() }, [])

const addItem = async () => {
if (!slug || !title) { toast.error('Slug and title are required'); return }
const res = await fetch('/api/admin/website-pages', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ slug, title, content }),
})
if (res.ok) {
toast.success('Page added')
setSlug(''); setTitle(''); setContent('')
load()
} else {
toast.error('Failed to add')
}
}

const togglePublished = async (item: Page) => {
const res = await fetch('/api/admin/website-pages', {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ id: item.id, isPublished: !item.isPublished }),
})
if (res.ok) { load() } else { toast.error('Update failed') }
}

const removeItem = async (id: string) => {
const res = await fetch(`/api/admin/website-pages?id=${id}`, { method: 'DELETE' })
if (res.ok) { toast.success('Deleted'); load() } else { toast.error('Delete failed') }
}

if (loading) return <div className="p-4">Loading...</div>

return (
<div className="p-4">
<h1 className="text-xl font-bold text-dark mb-4">Website Pages</h1>
<div className="bg-white rounded shadow p-4 mb-4">
<div className="grid md:grid-cols-2 gap-2 mb-2">
<input className="border rounded px-3 py-2 text-sm" placeholder="Slug (e.g. about-us)" value={slug} onChange={e => setSlug(e.target.value)} />
<input className="border rounded px-3 py-2 text-sm" placeholder="Page Title" value={title} onChange={e => setTitle(e.target.value)} />
</div>
<textarea className="border rounded px-3 py-2 text-sm w-full mb-2" rows={5} placeholder="Page Content" value={content} onChange={e => setContent(e.target.value)} />
<button className="bg-admin-dark text-white px-4 py-2 rounded text-sm" onClick={addItem}>Add Page</button>
</div>
<div className="bg-white rounded shadow">
<table className="w-full text-sm">
<thead>
<tr className="border-b text-left">
<th className="p-2">Slug</th>
<th className="p-2">Title</th>
<th className="p-2">Published</th>
<th className="p-2">Actions</th>
</tr>
</thead>
<tbody>
{items.map(item => (
<tr key={item.id} className="border-b">
<td className="p-2">{item.slug}</td>
<td className="p-2">{item.title}</td>
<td className="p-2"><input type="checkbox" checked={item.isPublished} onChange={() => togglePublished(item)} /></td>
<td className="p-2"><a href={"/" + item.slug} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs mr-3">View Live</a><button className="text-red-600 text-xs" onClick={() => removeItem(item.id)}>Delete</button></td></tr>
))}
</tbody>
</table>
</div>
</div>
)
}
