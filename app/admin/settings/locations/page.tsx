'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface Location {
id: string
name: string
address: string | null
city: string | null
state: string | null
zip: string | null
phone: string | null
isActive: boolean
isDefault: boolean
}

export default function LocationsPage() {
const [locations, setLocations] = useState<Location[]>([])
const [name, setName] = useState('')
const [address, setAddress] = useState('')
const [city, setCity] = useState('')
const [state, setState] = useState('')
const [zip, setZip] = useState('')
const [phone, setPhone] = useState('')

const load = () => {
fetch('/api/admin/locations')
.then((r) => r.json())
.then((d) => setLocations(d.locations || []))
}

useEffect(() => {
load()
}, [])

const addLocation = async () => {
if (!name) {
toast.error('Name is required')
return
}
const res = await fetch('/api/admin/locations', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ name, address, city, state, zip, phone }),
})
if (res.ok) {
toast.success('Location added')
setName('')
setAddress('')
setCity('')
setState('')
setZip('')
setPhone('')
load()
} else {
toast.error('Failed to add location')
}
}

const updateLocation = async (id: string, field: keyof Location, val: string | boolean) => {
setLocations((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: val } : l)))
await fetch('/api/admin/locations', {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ id, [field]: val }),
})
}

const deleteLocation = async (id: string) => {
const res = await fetch(`/api/admin/locations?id=${id}`, { method: 'DELETE' })
if (res.ok) {
toast.success('Location removed')
load()
} else {
toast.error('Failed to remove location')
}
}

return (
<div className="p-6 max-w-5xl mx-auto">
<h1 className="text-2xl font-semibold mb-4">Locations</h1>
<p className="text-sm text-gray-600 mb-4">
Manage the physical warehouse or office locations used for inventory and delivery.
</p>
<div className="flex flex-wrap gap-2 items-end mb-6">
<div>
<label className="block text-xs text-gray-500">Name</label>
<input className="border rounded px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
</div>
<div>
<label className="block text-xs text-gray-500">Address</label>
<input className="border rounded px-3 py-2 text-sm" value={address} onChange={(e) => setAddress(e.target.value)} />
</div>
<div>
<label className="block text-xs text-gray-500">City</label>
<input className="border rounded px-3 py-2 text-sm w-28" value={city} onChange={(e) => setCity(e.target.value)} />
</div>
<div>
<label className="block text-xs text-gray-500">State</label>
<input className="border rounded px-3 py-2 text-sm w-16" value={state} onChange={(e) => setState(e.target.value)} />
</div>
<div>
<label className="block text-xs text-gray-500">Zip</label>
<input className="border rounded px-3 py-2 text-sm w-20" value={zip} onChange={(e) => setZip(e.target.value)} />
</div>
<div>
<label className="block text-xs text-gray-500">Phone</label>
<input className="border rounded px-3 py-2 text-sm" value={phone} onChange={(e) => setPhone(e.target.value)} />
</div>
<button className="bg-admin-dark text-white px-4 py-2 rounded text-sm" onClick={addLocation}>
Add Location
</button>
</div>

<table className="w-full border-collapse">
<thead>
<tr className="text-left text-xs text-gray-500 border-b">
<th className="py-2">Name</th>
<th className="py-2">Address</th>
<th className="py-2">City/State/Zip</th>
<th className="py-2">Phone</th>
<th className="py-2">Default</th>
<th className="py-2">Active</th>
<th className="py-2"></th>
</tr>
</thead>
<tbody>
{locations.map((l) => (
<tr key={l.id} className="border-b">
<td className="py-2">
<input className="border rounded px-2 py-1 text-sm" value={l.name} onChange={(e) => updateLocation(l.id, 'name', e.target.value)} />
</td>
<td className="py-2">
<input className="border rounded px-2 py-1 text-sm" value={l.address || ''} onChange={(e) => updateLocation(l.id, 'address', e.target.value)} />
</td>
<td className="py-2">
<input className="border rounded px-2 py-1 text-sm w-20" value={l.city || ''} onChange={(e) => updateLocation(l.id, 'city', e.target.value)} />
<input className="border rounded px-2 py-1 text-sm w-14 ml-1" value={l.state || ''} onChange={(e) => updateLocation(l.id, 'state', e.target.value)} />
<input className="border rounded px-2 py-1 text-sm w-16 ml-1" value={l.zip || ''} onChange={(e) => updateLocation(l.id, 'zip', e.target.value)} />
</td>
<td className="py-2">
<input className="border rounded px-2 py-1 text-sm" value={l.phone || ''} onChange={(e) => updateLocation(l.id, 'phone', e.target.value)} />
</td>
<td className="py-2">
<input type="checkbox" checked={l.isDefault} onChange={(e) => updateLocation(l.id, 'isDefault', e.target.checked)} />
</td>
<td className="py-2">
<input type="checkbox" checked={l.isActive} onChange={(e) => updateLocation(l.id, 'isActive', e.target.checked)} />
</td>
<td className="py-2">
<button className="text-red-600 text-xs" onClick={() => deleteLocation(l.id)}>
Delete
</button>
</td>
</tr>
))}
</tbody>
</table>
</div>
)
}
