'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export default function SystemSettingsPage() {
const [sessionTimeout, setSessionTimeout] = useState('60')
const [maintenanceMode, setMaintenanceMode] = useState(false)
const [loading, setLoading] = useState(true)

useEffect(() => {
fetch('/api/admin/system-settings?category=system')
.then((r) => r.json())
.then((d) => {
const settings = d.settings || []
const st = settings.find((s: any) => s.key === 'sessionTimeoutMinutes')
const mm = settings.find((s: any) => s.key === 'maintenanceMode')
if (st) setSessionTimeout(st.value)
if (mm) setMaintenanceMode(mm.value === 'true')
setLoading(false)
})
}, [])

const save = async () => {
const res = await fetch('/api/admin/system-settings', {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
items: [
{ category: 'system', key: 'sessionTimeoutMinutes', value: sessionTimeout },
{ category: 'system', key: 'maintenanceMode', value: String(maintenanceMode) },
],
}),
})
if (res.ok) {
toast.success('System settings saved')
} else {
toast.error('Failed to save')
}
}

if (loading) return <div className="p-6">Loading...</div>

return (
<div className="p-6 max-w-xl mx-auto">
<h1 className="text-2xl font-semibold mb-4">System Settings</h1>
<p className="text-sm text-gray-600 mb-4">
Core system behavior settings for administrator sessions and maintenance.
</p>
<label className="block text-xs text-gray-500 mb-1">Session Timeout (minutes)</label>
<input className="border rounded px-3 py-2 text-sm w-full mb-4" value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} />
<label className="flex items-center gap-2 mb-4 text-sm">
<input type="checkbox" checked={maintenanceMode} onChange={(e) => setMaintenanceMode(e.target.checked)} />
Enable maintenance mode (blocks customer-facing site)
</label>
<button className="bg-admin-dark text-white px-4 py-2 rounded text-sm" onClick={save}>
Save
</button>
</div>
)
}
