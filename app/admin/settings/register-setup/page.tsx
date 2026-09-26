'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface Register {
id: string
name: string
location: string | null
isActive: boolean
}

export default function RegisterSetupPage() {
const [registers, setRegisters] = useState<Register[]>([])
const [loading, setLoading] = useState(true)
const [name, setName] = useState('')
const [location, setLocation] = useState('')

const load = async () => {
const res = await fetch('/api/admin/register-setup')
const data = await res.json()
setRegisters(data.registers || [])
setLoading(false)
}

useEffect(() => {
load()
}, [])

const addRegister = async () => {
if (!name) return toast.error('Name is required')
const res = await fetch('/api/admin/register-setup', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ name, location }),
})
if (res.ok) {
toast.success('Register added')
setName('')
setLocation('')
load()
} else {
toast.error('Failed to add register')
}
}

const toggleActive = async (register: Register) => {
const res = await fetch('/api/admin/register-setup', {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ id: register.id, isActive: !register.isActive }),
})
if (res.ok) {
toast.success('Updated')
load()
}
}

const remove = async (id: string) => {
const res = await fetch(`/api/admin/register-setup?id=${id}`, { method: 'DELETE' })
if (res.ok) {
toast.success('Deleted')
load()
}
}

if (loading) return <div className="p-6">Loading...</div>

return (
<div className="p-6 max-w-3xl">
<h1 className="text-xl font-bold text-dark mb-2">Register Setup</h1>
<p className="text-sm text-gray-500 mb-4">
This section is primarily used for multi-location businesses with physical point-of-sale registers.
Since Friendly Party Rental operates from a single location, this is optional to configure.
</p>
<div className="bg-white border rounded p-4 mb-6 space-y-2">
<input
className="border rounded px-3 py-2 text-sm w-full"
placeholder="Register name"
value={name}
onChange={(e) => setName(e.target.value)}
/>
<input
className="border rounded px-3 py-2 text-sm w-full"
placeholder="Location"
value={location}
onChange={(e) => setLocation(e.target.value)}
/>
<button onClick={addRegister} className="bg-admin-dark text-white px-4 py-2 rounded text-sm">
Add Register
</button>
</div>

<div className="space-y-2">
{registers.map((register) => (
<div key={register.id} className="border rounded p-3 flex items-center justify-between bg-white">
<div>
<div className="font-medium">{register.name}</div>
<div className="text-sm text-gray-500">{register.location}</div>
</div>
<div className="flex items-center gap-3">
<label className="flex items-center gap-1 text-sm">
<input
type="checkbox"
checked={register.isActive}
onChange={() => toggleActive(register)}
/>
Active
</label>
<button onClick={() => remove(register.id)} className="text-red-600 text-sm">
Delete
</button>
</div>
</div>
))}
</div>
</div>
)
}
