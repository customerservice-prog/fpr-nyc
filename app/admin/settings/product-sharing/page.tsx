'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

export default function ProductSharingPage() {
const [loading, setLoading] = useState(true)
const [shareAcrossLocations, setShareAcrossLocations] = useState(false)
const [notes, setNotes] = useState('')

const load = async () => {
const res = await fetch('/api/admin/product-sharing')
const data = await res.json()
if (data.settings) {
setShareAcrossLocations(data.settings.shareAcrossLocations)
setNotes(data.settings.notes || '')
}
setLoading(false)
}

useEffect(() => {
load()
}, [])

const save = async () => {
const res = await fetch('/api/admin/product-sharing', {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ shareAcrossLocations, notes }),
})
if (res.ok) {
toast.success('Product sharing settings saved')
} else {
toast.error('Failed to save settings')
}
}

if (loading) return <div className="p-6">Loading...</div>

return (
<div className="p-6 max-w-2xl">
<h1 className="text-xl font-bold text-dark mb-2">Product Sharing</h1>
<p className="text-sm text-gray-500 mb-4">
This setting controls whether inventory items are shared across multiple business locations.
Since Friendly Party Rental operates from a single location, this can remain off.
</p>
<div className="bg-white border rounded p-4 space-y-4">
<label className="flex items-center gap-2 text-sm">
<input
type="checkbox"
checked={shareAcrossLocations}
onChange={(e) => setShareAcrossLocations(e.target.checked)}
/>
Share products across locations
</label>
<div>
<label className="block text-sm mb-1">Notes</label>
<textarea
className="border rounded px-3 py-2 text-sm w-full"
rows={3}
value={notes}
onChange={(e) => setNotes(e.target.value)}
/>
</div>
<button onClick={save} className="bg-admin-dark text-white px-4 py-2 rounded text-sm">
Save Settings
</button>
</div>
</div>
)
}
