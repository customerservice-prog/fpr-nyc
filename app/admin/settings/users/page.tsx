'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export default function UsersPage() {
  const [users, setUsers] = useState<Array<{ id: string; username: string; name: string; role: string }>>([])
  const [form, setForm] = useState({ username: '', name: '', password: '', role: 'employee' })
  const [submitting, setSubmitting] = useState(false)

  const loadUsers = () => {
    fetch('/api/admin/settings/users')
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.username || !form.name || !form.password) {
      toast.error('Please fill in username, name, and password')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/settings/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to create user')
        return
      }
      toast.success('Employee account created')
      setForm({ username: '', name: '', password: '', role: 'employee' })
      loadUsers()
    } catch {
      toast.error('Failed to create user')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-dark mb-6">Users</h1>

      <div className="bg-white rounded shadow overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-admin-green text-white">
            <tr>
              <th className="px-4 py-3 text-left">Username</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b">
                <td className="px-4 py-3 font-medium">{u.username}</td>
                <td className="px-4 py-3">{u.name}</td>
                <td className="px-4 py-3 capitalize">{u.role === 'admin' ? 'Administrator' : 'Employee'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded shadow p-4 max-w-lg">
        <h2 className="font-bold text-dark mb-4">Add Employee Login</h2>
        <p className="text-xs text-gray-500 mb-4">
          Employees can manage orders, customers, scheduling, and delivery, but cannot access Reports or Admin Settings.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-body mb-1">Full Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border rounded px-3 py-2 text-sm w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-body mb-1">Username</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="border rounded px-3 py-2 text-sm w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-body mb-1">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="border rounded px-3 py-2 text-sm w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-body mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="border rounded px-3 py-2 text-sm w-full"
            >
              <option value="employee">Employee</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <button type="submit" disabled={submitting} className="btn-admin disabled:opacity-50">
            {submitting ? 'Creating...' : 'Create Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
