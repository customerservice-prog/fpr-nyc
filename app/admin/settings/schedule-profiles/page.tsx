'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface Profile {
id: string
name: string
description: string | null
daysOfWeek: string
isActive: boolean
}

export default function ScheduleProfilesPage() {
const [profiles, setProfiles] = useState<Profile[]>([])
const [loading, setLoading] = useState(true)
const [name, setName] = useState('')
const [description, setDescription] = useState('')
const [daysOfWeek, setDaysOfWeek] = useState('Mon,Tue,Wed,Thu,Fri,Sat,Sun')

const load = async () => {
const res = await fetch('/api/admin/schedule-profiles')
const data = await res.json()
setProfiles(data.profiles || [])
setLoading(false)
}

useEffect(() => {
load()
}, [])

const addProfile = async () => {
if (!name) return toast.error('Name is required')
const res = await fetch('/api/admin/schedule-profiles', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ name, description, daysOfWeek }),
})
if (res.ok) {
toast.success('Schedule profile added')
setName('')
setDescription('')
setDaysOfWeek('Mon,Tue,Wed,Thu,Fri,Sat,Sun')
load()
} else {
toast.error('Failed to add profile')
}
}

const toggleActive = async (profile: Profile) => {
const res = await fetch('/api/admin/schedule-profiles', {
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
const res = await fetch(`/api/admin/schedule-profiles?id=${id}`, { method: 'DELETE' })
if (res.ok) {
toast.success('Deleted')
load()
}
}

if (loading) return <div className="p-6">Loading...</div>

return (
<div className="p-6 max-w-3xl">
<h1 className="text-xl font-bold text-dark mb-4">Schedule Profiles</h1>
<div className="bg-white border rounded p-4 mb-6 space-y-2">
<input
className="border rounded px-3 py-2 text-sm w-full"
placeholder="Profile name"
value={name}
onChange={(e) => setName(e.target.value)}
/>
<input
className="border rounded px-3 py-2 text-sm w-full"
placeholder="Description"
value={description}
onChange={(e) => setDescription(e.target.value)}
/>
<input
className="border rounded px-3 py-2 text-sm w-full"
placeholder="Days of week (e.g. Mon,Tue,Wed)"
value={daysOfWeek}
onChange={(e) => setDaysOfWeek(e.target.value)}
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
<div className="text-sm text-gray-500">{profile.description}</div>
<div className="text-xs text-gray-400">{profile.daysOfWeek}</div>
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
