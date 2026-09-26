'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface Addon {
id: string
name: string
description: string | null
price: number
isActive: boolean
}

export default function AddonsPage() {
const [addons, setAddons] = useState<Addon[]>([])
const [loading, setLoading] = useState(true)
const [name, setName] = useState('')
const [description, setDescription] = useState('')
const [price, setPrice] = useState('0')

const load = async () => {
const res = await fetch('/api/admin/addons')
const data = await res.json()
setAddons(data.addons || [])
setLoading(false)
}

useEffect(() => {
load()
}, [])

const addAddon = async () => {
if (!name) return toast.error('Name is required')
const res = await fetch('/api/admin/addons', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ name, description, price }),
})
if (res.ok) {
toast.success('Addon added')
setName('')
setDescription('')
setPrice('0')
load()
} else {
toast.error('Failed to add addon')
}
}

const toggleActive = async (addon: Addon) => {
const res = await fetch('/api/admin/addons', {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ id: addon.id, isActive: !addon.isActive }),
})
if (res.ok) {
toast.success('Updated')
load()
}
}

const remove = async (id: string) => {
const res = await fetch(`/api/admin/addons?id=${id}`, { method: 'DELETE' })
if (res.ok) {
toast.success('Deleted')
load()
}
}

if (loading) return <div className="p-6">Loading...</div>

return (
<div className="p-6 max-w-3xl">
<h1 className="text-xl font-bold text-dark mb-4">Addons</h1>
<div className="bg-white border rounded p-4 mb-6 space-y-2">
<input
className="border rounded px-3 py-2 text-sm w-full"
placeholder="Addon name"
value={name}
onChange={(e) => setName(e.target.value)}
/>
<input
className="border rounded px-3 py-2 text-sm w-full"
placeholder="Description"
value={description}
onChange={(e) => setDescription(e.target.value)}
/>
<input
className="border rounded px-3 py-2 text-sm w-full"
type="number"
placeholder="Price"
value={price}
onChange={(e) => setPrice(e.target.value)}
/>
<button onClick={addAddon} className="bg-admin-dark text-white px-4 py-2 rounded text-sm">
Add Addon
</button>
</div>

<div className="space-y-2">
{addons.map((addon) => (
<div key={addon.id} className="border rounded p-3 flex items-center justify-between bg-white">
<div>
<div className="font-medium">{addon.name} - ${addon.price.toFixed(2)}</div>
<div className="text-sm text-gray-500">{addon.description}</div>
</div>
<div className="flex items-center gap-3">
<label className="flex items-center gap-1 text-sm">
<input
type="checkbox"
checked={addon.isActive}
onChange={() => toggleActive(addon)}
/>
Active
</label>
<button onClick={() => remove(addon.id)} className="text-red-600 text-sm">
Delete
</button>
</div>
</div>
))}
</div>
</div>
)
}
