'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export default function SystemSetupPage() {
const [dateFormat, setDateFormat] = useState('MM/DD/YYYY')
const [defaultLanguage, setDefaultLanguage] = useState('English')
const [loading, setLoading] = useState(true)

useEffect(() => {
fetch('/api/admin/system-settings?category=setup')
.then((r) => r.json())
.then((d) => {
const settings = d.settings || []
const df = settings.find((s: any) => s.key === 'dateFormat')
const dl = settings.find((s: any) => s.key === 'defaultLanguage')
if (df) setDateFormat(df.value)
if (dl) setDefaultLanguage(dl.value)
setLoading(false)
})
}, [])

const save = async () => {
const res = await fetch('/api/admin/system-settings', {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
items: [
{ category: 'setup', key: 'dateFormat', value: dateFormat },
{ category: 'setup', key: 'defaultLanguage', value: defaultLanguage },
],
}),
})
if (res.ok) {
toast.success('System setup saved')
} else {
toast.error('Failed to save')
}
}

if (loading) return <div className="p-6">Loading...</div>

return (
<div className="p-6 max-w-xl mx-auto">
<h1 className="text-2xl font-semibold mb-4">System Setup</h1>
<p className="text-sm text-gray-600 mb-4">
Basic system-wide formatting and language preferences.
</p>
<label className="block text-xs text-gray-500 mb-1">Date Format</label>
<select className="border rounded px-3 py-2 text-sm w-full mb-4" value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
<option value="MM/DD/YYYY">MM/DD/YYYY</option>
<option value="DD/MM/YYYY">DD/MM/YYYY</option>
<option value="YYYY-MM-DD">YYYY-MM-DD</option>
</select>
<label className="block text-xs text-gray-500 mb-1">Default Language</label>
<input className="border rounded px-3 py-2 text-sm w-full mb-4" value={defaultLanguage} onChange={(e) => setDefaultLanguage(e.target.value)} />
<button className="bg-admin-dark text-white px-4 py-2 rounded text-sm" onClick={save}>
Save
</button>
</div>
)
}
