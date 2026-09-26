'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface Item {
id: string
name: string
cost: number
costOfGoods: number
category: { name: string } | null
}

export default function CostOfGoodsPage() {
const [items, setItems] = useState<Item[]>([])
const [loading, setLoading] = useState(true)
const [edits, setEdits] = useState<Record<string, string>>({})

const load = async () => {
const res = await fetch('/api/admin/item-extras')
const data = await res.json()
setItems(data.items || [])
setLoading(false)
}

useEffect(() => {
load()
}, [])

const save = async (itemId: string) => {
const value = edits[itemId]
if (value === undefined) return
const res = await fetch('/api/admin/item-extras', {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ itemId, costOfGoods: value }),
})
if (res.ok) {
toast.success('Cost of goods updated')
load()
} else {
toast.error('Failed to update')
}
}

if (loading) return <div className="p-6">Loading...</div>

return (
<div className="p-6 max-w-4xl">
<h1 className="text-xl font-bold text-dark mb-2">Cost of Goods</h1>
<p className="text-sm text-gray-500 mb-4">
Track your internal replacement or acquisition cost for each item, separate from the rental price charged to customers.
</p>
<div className="bg-white border rounded divide-y">
{items.map((item) => (
<div key={item.id} className="p-3 flex items-center justify-between gap-4">
<div className="flex-1">
<div className="font-medium">{item.name}</div>
<div className="text-xs text-gray-400">
{item.category?.name} - Rental price: ${item.cost?.toFixed(2)}
</div>
</div>
<input
className="border rounded px-3 py-2 text-sm w-32"
type="number"
placeholder={item.costOfGoods.toFixed(2)}
value={edits[item.id] ?? ''}
onChange={(e) => setEdits({ ...edits, [item.id]: e.target.value })}
/>
<button
onClick={() => save(item.id)}
className="bg-admin-dark text-white px-3 py-2 rounded text-sm"
>
Save
</button>
</div>
))}
</div>
</div>
)
}
