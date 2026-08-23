'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface Survey {
id: string
name: string
questions: string
isActive: boolean
}

export default function SetupSurveysPage() {
const [items, setItems] = useState<Survey[]>([])
const [name, setName] = useState('')
const [questions, setQuestions] = useState('')
const [loading, setLoading] = useState(true)

const load = async () => {
const res = await fetch('/api/admin/setup-surveys')
const data = await res.json()
setItems(data.items || [])
setLoading(false)
}

useEffect(() => { load() }, [])

const addItem = async () => {
if (!name) { toast.error('Name is required'); return }
const res = await fetch('/api/admin/setup-surveys', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ name, questions }),
})
if (res.ok) {
toast.success('Survey added')
setName(''); setQuestions('')
load()
} else {
toast.error('Failed to add survey')
}
}

const toggleActive = async (item: Survey) => {
const res = await fetch('/api/admin/setup-surveys', {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
})
if (res.ok) { load() } else { toast.error('Update failed') }
}

const removeItem = async (id: string) => {
const res = await fetch(`/api/admin/setup-surveys?id=${id}`, { method: 'DELETE' })
if (res.ok) { toast.success('Deleted'); load() } else { toast.error('Delete failed') }
}

if (loading) return <div className="p-4">Loading...</div>

return (
<div className="p-4">
<h1 className="text-xl font-bold text-dark mb-4">Setup Surveys</h1>
<div className="bg-white rounded shadow p-4 mb-4">
<input className="border rounded px-3 py-2 text-sm w-full mb-2" placeholder="Survey Name" value={name} onChange={e => setName(e.target.value)} />
<textarea className="border rounded px-3 py-2 text-sm w-full mb-2" rows={4} placeholder="Questions (one per line)" value={questions} onChange={e => setQuestions(e.target.value)} />
<button className="bg-admin-dark text-white px-4 py-2 rounded text-sm" onClick={addItem}>Add Survey</button>
</div>
<div className="bg-white rounded shadow">
<table className="w-full text-sm">
<thead>
<tr className="border-b text-left">
<th className="p-2">Name</th>
<th className="p-2">Questions</th>
<th className="p-2">Active</th>
<th className="p-2">Actions</th>
</tr>
</thead>
<tbody>
{items.map(item => (
<tr key={item.id} className="border-b">
<td className="p-2">{item.name}</td>
<td className="p-2 whitespace-pre-line">{item.questions}</td>
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
