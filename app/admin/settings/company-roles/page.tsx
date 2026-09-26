'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface CompanyRole {
id: string
name: string
sortOrder: number
isActive: boolean
}

export default function CompanyRolesPage() {
const [roles, setRoles] = useState<CompanyRole[]>([])
const [name, setName] = useState('')

const load = () => {
fetch('/api/admin/company-roles')
.then((r) => r.json())
.then((d) => setRoles(d.companyRoles || []))
}

useEffect(() => {
load()
}, [])

const addRole = async () => {
if (!name) {
toast.error('Name is required')
return
}
const res = await fetch('/api/admin/company-roles', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ name, sortOrder: roles.length }),
})
if (res.ok) {
toast.success('Company role added')
setName('')
load()
} else {
toast.error('Failed to add')
}
}

const updateRole = async (id: string, field: keyof CompanyRole, val: string | boolean) => {
setRoles((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: val } : r)))
await fetch('/api/admin/company-roles', {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ id, [field]: val }),
})
}

const deleteRole = async (id: string) => {
const res = await fetch(`/api/admin/company-roles?id=${id}`, { method: 'DELETE' })
if (res.ok) {
toast.success('Company role removed')
load()
} else {
toast.error('Failed to remove')
}
}

return (
<div className="p-6 max-w-3xl mx-auto">
<h1 className="text-2xl font-semibold mb-4">Company Roles</h1>
<p className="text-sm text-gray-600 mb-4">
Contact roles that can be assigned to people at a customer's company, such as Owner or Site Contact.
</p>
<div className="flex gap-2 items-end mb-6">
<div>
<label className="block text-xs text-gray-500">Name</label>
<input className="border rounded px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
</div>
<button className="bg-admin-dark text-white px-4 py-2 rounded text-sm" onClick={addRole}>
Add Company Role
</button>
</div>

<table className="w-full border-collapse">
<thead>
<tr className="text-left text-xs text-gray-500 border-b">
<th className="py-2">Name</th>
<th className="py-2">Active</th>
<th className="py-2"></th>
</tr>
</thead>
<tbody>
{roles.map((r) => (
<tr key={r.id} className="border-b">
<td className="py-2">
<input className="border rounded px-2 py-1 text-sm" value={r.name} onChange={(e) => updateRole(r.id, 'name', e.target.value)} />
</td>
<td className="py-2">
<input type="checkbox" checked={r.isActive} onChange={(e) => updateRole(r.id, 'isActive', e.target.checked)} />
</td>
<td className="py-2">
<button className="text-red-600 text-xs" onClick={() => deleteRole(r.id)}>
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
