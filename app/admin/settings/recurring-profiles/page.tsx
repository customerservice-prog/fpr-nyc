'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface Profile {
id: string
name: string
frequency: string
dayOfMonth: number | null
dayOfWeek: string | null
notes: string | null
isActive: boolean
}

export default function RecurringProfilesPage() {
const [profiles, setProfiles] = useState<Profile[]>([])
const [loading, setLoading] = useState(true)
const [name, setName] = useState('')
const [frequency, setFrequency] = useState('Monthly')
const [notes, setNotes] = useState('')

const load = async () => {
const res = await fetch('/api/admin/recurring-profiles')
const data = await res.json()
setProfiles(data.profiles || [])
setLoading(false)
}

useEffect(() => {
load()
}, [])

const addProfile = async () => {
if (!name) return toast.error('Name is required')
const res = await fetch('/api/admin/recurring-profiles', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ name, frequency, notes }),
})
if (res.ok) {
toast.success('Recurring profile added')
setName('')
setNotes('')
load()
} else {
toast.error('Failed to add profile')
}
}

const toggleActive = async (profile: Profile) => {
const res = await fetch('/api/admin/recurring-profiles', {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ id: profile.id, isActive: !profile.isActive }),
})
if (res.ok) {
toast.success('Updated')
load()
}
}

const remove = async (id: string) => {
const res = await fetch(`/api/admin/recurring-profiles?id=${id}`, { method: 'DELETE' })
if (res.ok) {
toast.success('Deleted')
load()
}
}

if (loading) return <div className="p-6">Loading...</div>

return (
<div className="p-6 max-w-3xl">
<h1 className="text-xl font-bold text-dark mb-4">Recurring Profiles</h1>
<div className="bg-white border rounded p-4 mb-6 space-y-2">
<input
className="border rounded px-3 py-2 text-sm w-full"
placeholder="Profile name"
value={name}
onChange={(e) => setName(e.target.value)}
/>
<select
className="border rounded px-3 py-2 text-sm w-full"
value={frequency}
onChange={(e) => setFrequency(e.target.value)}
>
<option value="Weekly">Weekly</option>
<option value="Monthly">Monthly</option>
<option value="Yearly">Yearly</option>
</select>
<input
className="border rounded px-3 py-2 text-sm w-full"
placeholder="Notes"
value={notes}
onChange={(e) => setNotes(e.target.value)}
/>
<button onClick={addProfile} className="bg-admin-dark text-white px-4 py-2 rounded text-sm">
Add Profile
</button>
</div>

<div className="space-y-2">
{profiles.map((profile) => (
<div key={profile.id} className="border rounded p-3 flex items-center justify-between bg-white">
<div>
<div className="font-medium">{profile.name}</div>
<div className="text-sm text-gray-500">{profile.frequency}</div>
<div className="text-xs text-gray-400">{profile.notes}</div>
</div>
<div className="flex items-center gap-3">
<label className="flex items-center gap-1 text-sm">
<input
type="checkbox"
checked={profile.isActive}
onChange={() => toggleActive(profile)}
/>
Active
</label>
<button onClick={() => remove(profile.id)} className="text-red-600 text-sm">
Delete
</button>
</div>
</div>
))}
</div>
</div>
)
}
