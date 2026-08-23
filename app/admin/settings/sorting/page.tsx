'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface Category {
id: string
name: string
sortOrder: number
}

interface Item {
id: string
name: string
sortOrder: number
category: { name: string } | null
}

export default function SortingPage() {
const [categories, setCategories] = useState<Category[]>([])
const [items, setItems] = useState<Item[]>([])
const [loading, setLoading] = useState(true)
const [catEdits, setCatEdits] = useState<Record<string, string>>({})
const [itemEdits, setItemEdits] = useState<Record<string, string>>({})

const load = async () => {
const [catRes, itemRes] = await Promise.all([
fetch('/api/admin/categories'),
fetch('/api/admin/item-extras'),
])
const catData = await catRes.json()
const itemData = await itemRes.json()
setCategories(catData.categories || [])
setItems(itemData.items || [])
setLoading(false)
}

useEffect(() => {
load()
}, [])

const saveCategory = async (id: string) => {
const value = catEdits[id]
if (value === undefined) return
const res = await fetch('/api/admin/categories', {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ id, sortOrder: value }),
})
if (res.ok) {
toast.success('Category order updated')
load()
} else {
toast.error('Failed to update')
}
}

const saveItem = async (itemId: string) => {
const value = itemEdits[itemId]
if (value === undefined) return
const res = await fetch('/api/admin/item-extras', {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ itemId, sortOrder: value }),
})
if (res.ok) {
toast.success('Item order updated')
load()
} else {
toast.error('Failed to update')
}
}

if (loading) return <div className="p-6">Loading...</div>

return (
<div className="p-6 max-w-4xl">
<h1 className="text-xl font-bold text-dark mb-4">Sorting</h1>

<h2 className="text-lg font-semibold text-dark mb-2">Categories</h2>
<div className="bg-white border rounded divide-y mb-8">
{categories.sort((a, b) => a.sortOrder - b.sortOrder).map((cat) => (
<div key={cat.id} className="p-3 flex items-center justify-between gap-4">
<div className="flex-1 font-medium">{cat.name}</div>
<input
className="border rounded px-3 py-2 text-sm w-24"
type="number"
placeholder={String(cat.sortOrder)}
value={catEdits[cat.id] ?? ''}
onChange={(e) => setCatEdits({ ...catEdits, [cat.id]: e.target.value })}
/>
<button
onClick={() => saveCategory(cat.id)}
className="bg-admin-dark text-white px-3 py-2 rounded text-sm"
>
Save
</button>
</div>
))}
</div>

<h2 className="text-lg font-semibold text-dark mb-2">Items</h2>
<div className="bg-white border rounded divide-y">
{items.sort((a, b) => a.sortOrder - b.sortOrder).map((item) => (
<div key={item.id} className="p-3 flex items-center justify-between gap-4">
<div className="flex-1">
<div className="font-medium">{item.name}</div>
<div className="text-xs text-gray-400">{item.category?.name}</div>
</div>
<input
className="border rounded px-3 py-2 text-sm w-24"
type="number"
placeholder={String(item.sortOrder)}
value={itemEdits[item.id] ?? ''}
onChange={(e) => setItemEdits({ ...itemEdits, [item.id]: e.target.value })}
/>
<button
onClick={() => saveItem(item.id)}
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
