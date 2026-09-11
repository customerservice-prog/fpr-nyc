'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface Driver {
id: string
name: string
phone: string | null
email: string | null
vehicleInfo: string | null
notes: string | null
isActive: boolean
pin: string | null
}

export default function DriversPage() {
const [drivers, setDrivers] = useState<Driver[]>([])
const [loading, setLoading] = useState(true)
const [newDriver, setNewDriver] = useState({ name: '', phone: '', email: '', vehicleInfo: '' })

const load = () => {
setLoading(true)
fetch('/api/admin/drivers')
.then((r) => r.json())
.then((d) => setDrivers(d.drivers || []))
.finally(() => setLoading(false))
}

useEffect(() => {
load()
}, [])

const addDriver = async () => {
if (!newDriver.name.trim()) {
toast.error('Driver name is required')
return
}
const res = await fetch('/api/admin/drivers', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(newDriver),
})
if (res.ok) {
toast.success('Driver added')
setNewDriver({ name: '', phone: '', email: '', vehicleInfo: '' })
load()
} else {
toast.error('Failed to add driver')
}
}

const updateDriver = (id: string, field: keyof Driver, value: string | boolean) => {
setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)))
}

const saveDriver = async (driver: Driver) => {
const res = await fetch('/api/admin/drivers/' + driver.id, {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(driver),
})
if (res.ok) toast.success(driver.name + ' saved')
else toast.error('Failed to save')
}

const deactivateDriver = async (driver: Driver) => {
if (!confirm('Deactivate ' + driver.name + '? They will no longer appear as an assignable driver.')) return
const res = await fetch('/api/admin/drivers/' + driver.id, { method: 'DELETE' })
if (res.ok) {
toast.success('Driver deactivated')
load()
} else {
toast.error('Failed to deactivate')
}
}

return (
<div className="p-4 max-w-5xl mx-auto">
<h1 className="text-2xl font-bold text-dark mb-2">Drivers</h1>
<p className="text-sm text-body mb-6">
Manage your delivery drivers here. Once added, drivers can be assigned to deliveries and pickups
from the Delivery page, and routes can be sequenced per truck for the day.
</p>

<div className="admin-card border-l-4 border-secondary flex flex-col sm:flex-row items-center gap-4">
<img
src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=https%3A%2F%2Fwww.friendlypartyrental.com%2Fdriver"
alt="Driver App QR Code"
width={160}
height={160}
/>
<div>
<h2 className="font-semibold text-dark mb-1">Driver App</h2>
<p className="text-sm text-body mb-2">
Have drivers scan this QR code with their phone camera to open the driver app. Once open, they can use their browser&apos;s &quot;Add to Home Screen&quot; option to install it for quick access like a regular app.
</p>
<a href="https://www.friendlypartyrental.com/driver" target="_blank" rel="noopener noreferrer" className="text-secondary text-sm hover:underline">
Open Driver App &rarr;
</a>
</div>
</div>

<div className="admin-card border-l-4 border-admin-green">
<h2 className="admin-card-header">Add a Driver</h2>
<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
<input
placeholder="Name"
value={newDriver.name}
onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
className="border border-gray-300 rounded px-3 py-2 text-sm"
/>
<input
placeholder="Phone"
value={newDriver.phone}
onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
className="border border-gray-300 rounded px-3 py-2 text-sm"
/>
<input
placeholder="Email"
value={newDriver.email}
onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
className="border border-gray-300 rounded px-3 py-2 text-sm"
/>
<input
placeholder="Vehicle (e.g. Box Truck #2)"
value={newDriver.vehicleInfo}
onChange={(e) => setNewDriver({ ...newDriver, vehicleInfo: e.target.value })}
className="border border-gray-300 rounded px-3 py-2 text-sm"
/>
</div>
<button onClick={addDriver} className="btn-admin text-sm px-4 py-2 mt-3">
Add Driver
</button>
</div>

<div className="admin-card !p-0 overflow-hidden">
<div className="overflow-x-auto">
<table className="w-full text-sm">
<thead>
<tr className="bg-gray-50 border-b border-gray-200">
<th className="px-4 py-3 text-left font-semibold text-dark">Name</th>
<th className="px-4 py-3 text-left font-semibold text-dark">Phone</th>
<th className="px-4 py-3 text-left font-semibold text-dark">Email</th>
<th className="px-4 py-3 text-left font-semibold text-dark">Vehicle</th>
<th className="px-4 py-3 text-center font-semibold text-dark">Active</th>
<th className="px-4 py-3 text-left font-semibold text-dark">PIN</th> <th className="px-4 py-3 text-center font-semibold text-dark">Actions</th>
</tr>
</thead>
<tbody>
{drivers.map((d, idx) => (
<tr key={d.id} className={'border-b border-gray-100 hover:bg-blue-50/50 transition-colors ' + (idx % 2 === 1 ? 'bg-gray-50/40' : '')}>
<td className="px-4 py-2">
<input
value={d.name}
onChange={(e) => updateDriver(d.id, 'name', e.target.value)}
className="border border-gray-300 rounded px-2 py-1 text-sm w-32"
/>
</td>
<td className="px-4 py-2">
<input
value={d.phone || ''}
onChange={(e) => updateDriver(d.id, 'phone', e.target.value)}
className="border border-gray-300 rounded px-2 py-1 text-sm w-28"
/>
</td>
<td className="px-4 py-2">
<input
value={d.email || ''}
onChange={(e) => updateDriver(d.id, 'email', e.target.value)}
className="border border-gray-300 rounded px-2 py-1 text-sm w-40"
/>
</td>
<td className="px-4 py-2">
<input
value={d.vehicleInfo || ''}
onChange={(e) => updateDriver(d.id, 'vehicleInfo', e.target.value)}
className="border border-gray-300 rounded px-2 py-1 text-sm w-32"
/>
</td>
<td className="px-4 py-2 text-center">
<input
type="checkbox"
checked={d.isActive}
onChange={(e) => updateDriver(d.id, 'isActive', e.target.checked)}
/>
</td>
<td className="px-4 py-2">
<input
value={d.pin || ''}
onChange={(e) => updateDriver(d.id, 'pin', e.target.value)}
className="border border-gray-300 rounded px-2 py-1 text-sm w-20"
placeholder="PIN"
/>
</td>
<td className="px-4 py-2 text-center whitespace-nowrap">
<button onClick={() => saveDriver(d)} className="btn-admin text-xs px-3 py-1 mr-2">
Save
</button>
<button
onClick={() => deactivateDriver(d)}
className="btn-danger-outline text-xs"
>
Deactivate
</button>
</td>
</tr>
))}
</tbody>
</table>
</div>
{!loading && drivers.length === 0 && (
<p className="text-body p-4">No drivers added yet.</p>
)}
</div>
</div>
)
}
