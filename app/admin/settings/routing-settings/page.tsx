'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export default function RoutingSettingsPage() {
const [maxStops, setMaxStops] = useState('20')
const [routeOptimization, setRouteOptimization] = useState(false)
const [loading, setLoading] = useState(true)

useEffect(() => {
fetch('/api/admin/system-settings?category=routing')
.then((r) => r.json())
.then((d) => {
const settings = d.settings || []
const stops = settings.find((s: any) => s.key === 'maxStopsPerRoute')
const opt = settings.find((s: any) => s.key === 'routeOptimization')
if (stops) setMaxStops(stops.value)
if (opt) setRouteOptimization(opt.value === 'true')
setLoading(false)
})
}, [])

const save = async () => {
const res = await fetch('/api/admin/system-settings', {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
items: [
{ category: 'routing', key: 'maxStopsPerRoute', value: maxStops },
{ category: 'routing', key: 'routeOptimization', value: String(routeOptimization) },
],
}),
})
if (res.ok) {
toast.success('Routing settings saved')
} else {
toast.error('Failed to save')
}
}

if (loading) return <div className="p-6">Loading...</div>

return (
<div className="p-6 max-w-xl mx-auto">
<h1 className="text-2xl font-semibold mb-4">Routing Settings</h1>
<p className="text-sm text-gray-600 mb-4">
Configure how delivery routes are planned for drivers.
</p>
<label className="block text-xs text-gray-500 mb-1">Max Stops Per Route</label>
<input className="border rounded px-3 py-2 text-sm w-full mb-4" value={maxStops} onChange={(e) => setMaxStops(e.target.value)} />
<label className="flex items-center gap-2 mb-4 text-sm">
<input type="checkbox" checked={routeOptimization} onChange={(e) => setRouteOptimization(e.target.checked)} />
Enable automatic route optimization (requires a mapping/routing provider connection)
</label>
<button className="bg-admin-dark text-white px-4 py-2 rounded text-sm" onClick={save}>
Save
</button>
</div>
)
}
