'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

const ZONES = [
'America/New_York',
'America/Chicago',
'America/Denver',
'America/Los_Angeles',
'America/Anchorage',
'Pacific/Honolulu',
]

export default function TimeZonePage() {
const [timeZone, setTimeZone] = useState('America/New_York')
const [loading, setLoading] = useState(true)

useEffect(() => {
fetch('/api/admin/system-settings?category=general')
.then((r) => r.json())
.then((d) => {
const found = (d.settings || []).find((s: any) => s.key === 'timeZone')
if (found) setTimeZone(found.value)
setLoading(false)
})
}, [])

const save = async () => {
const res = await fetch('/api/admin/system-settings', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ category: 'general', key: 'timeZone', value: timeZone }),
})
if (res.ok) {
toast.success('Time zone saved')
} else {
toast.error('Failed to save')
}
}

if (loading) return <div className="p-6">Loading...</div>

return (
<div className="p-6 max-w-xl mx-auto">
<h1 className="text-2xl font-semibold mb-4">Time Zone</h1>
<p className="text-sm text-gray-600 mb-4">
Set the time zone used for scheduling, orders, and reminders across the system.
</p>
<label className="block text-xs text-gray-500 mb-1">Company Time Zone</label>
<select className="border rounded px-3 py-2 text-sm w-full mb-4" value={timeZone} onChange={(e) => setTimeZone(e.target.value)}>
{ZONES.map((z) => (
<option key={z} value={z}>{z}</option>
))}
</select>
<button className="bg-admin-dark text-white px-4 py-2 rounded text-sm" onClick={save}>
Save
</button>
</div>
)
}
