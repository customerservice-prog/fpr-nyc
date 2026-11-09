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
const [adminPassword, setAdminPassword] = useState('')
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
toast.success('Private draft saved — publish it after reviewing')
setSlug(''); setTitle(''); setContent('')
load()
} else {
toast.error('Failed to add')
}
}

const togglePublished = async (item: Page) => {
if (!adminPassword) { toast.error('Enter your admin password to change live visibility'); return }
const action = item.isPublished ? 'unpublish' : 'publish'
if (!window.confirm('Are you sure you want to ' + action + ' this NYC page?')) return
const res = await fetch('/api/admin/website-pages', {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ id: item.id, publishLive: !item.isPublished, unpublishLive: item.isPublished, adminPassword }),
})
if (res.ok) { setAdminPassword(''); toast.success(item.isPublished ? 'Page unpublished' : 'Page published live'); load() }
else { const data = await res.json().catch(() => ({})); toast.error(data.error || 'Update failed') }
}

const removeItem = async (id: string) => {
if (!adminPassword) { toast.error('Enter your admin password to delete a page'); return }
if (!window.confirm('Permanently delete this NYC page? This cannot be undone.')) return
const res = await fetch(`/api/admin/website-pages?id=${encodeURIComponent(id)}`, {
method: 'DELETE',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ adminPassword }),
})
if (res.ok) { setAdminPassword(''); toast.success('Page deleted'); load() }
else { const data = await res.json().catch(() => ({})); toast.error(data.error || 'Delete failed') }
}

if (loading) return <div className="p-4">Loading...</div>

return (
<div className="p-4">
<h1 className="text-xl font-bold text-dark mb-2">Website Pages</h1>
<p className="mb-3 text-sm"><a href="/admin/website/pages" className="inline-block rounded-lg bg-blue-700 px-4 py-2 font-bold text-white">Open visual NYC Page Studio</a></p>
<p className="mb-4 text-sm text-gray-600">New NYC pages are saved privately. Publishing, unpublishing, and deletion require your admin password and confirmation.</p>
<div className="bg-white rounded shadow p-4 mb-4">
<div className="grid md:grid-cols-2 gap-2 mb-2">
<input className="border rounded px-3 py-2 text-sm" placeholder="Slug (e.g. about-us)" value={slug} onChange={e => setSlug(e.target.value)} />
<input className="border rounded px-3 py-2 text-sm" placeholder="Page Title" value={title} onChange={e => setTitle(e.target.value)} />
</div>
<textarea className="border rounded px-3 py-2 text-sm w-full mb-2" rows={5} placeholder="Page Content" value={content} onChange={e => setContent(e.target.value)} />
<button className="bg-admin-dark text-white px-4 py-2 rounded text-sm" onClick={addItem}>Save Private Draft</button>
</div>
<div className="rounded border bg-white p-4 mb-4">
<label htmlFor="nyc-page-admin-password" className="block mb-2 text-sm font-semibold">Admin password for live changes and deletion</label>
<input id="nyc-page-admin-password" type="password" autoComplete="current-password" className="border rounded px-3 py-2 text-sm w-full max-w-sm" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="Enter admin password only when needed" />
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
<td className="p-2"><label className="flex items-center gap-2"><input type="checkbox" checked={item.isPublished} onChange={() => togglePublished(item)} /><span>{item.isPublished ? 'Live' : 'Private draft'}</span></label></td>
<td className="p-2">{item.isPublished && <a href={"/" + item.slug} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs mr-3">View Live</a>}<button className="text-red-600 text-xs" onClick={() => removeItem(item.id)}>Delete</button></td></tr>
))}
</tbody>
</table>
</div>
</div>
)
}
