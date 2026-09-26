'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface Feature {
id: string
name: string
description: string | null
isEnabled: boolean
}

export default function PremiumFeaturesPage() {
const [items, setItems] = useState<Feature[]>([])
const [loading, setLoading] = useState(true)

const load = async () => {
const res = await fetch('/api/admin/premium-features')
const data = await res.json()
setItems(data.items || [])
setLoading(false)
}

useEffect(() => { load() }, [])

const toggleEnabled = async (item: Feature) => {
const res = await fetch('/api/admin/premium-features', {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ id: item.id, isEnabled: !item.isEnabled }),
})
if (res.ok) { toast.success('Updated'); load() } else { toast.error('Update failed') }
}

if (loading) return <div className="p-4">Loading...</div>

return (
<div className="p-4">
<h1 className="text-xl font-bold text-dark mb-4">Premium Features</h1>
<div className="bg-white rounded shadow">
<table className="w-full text-sm">
<thead>
<tr className="border-b text-left">
<th className="p-2">Name</th>
<th className="p-2">Description</th>
<th className="p-2">Enabled</th>
</tr>
</thead>
<tbody>
{items.map(item => (
<tr key={item.id} className="border-b">
<td className="p-2">{item.name}</td>
<td className="p-2">{item.description}</td>
<td className="p-2"><input type="checkbox" checked={item.isEnabled} onChange={() => toggleEnabled(item)} /></td>
</tr>
))}
</tbody>
</table>
</div>
</div>
)
}
