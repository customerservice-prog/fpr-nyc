'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export default function CompanyInfoPage() {
  const [form, setForm] = useState({
    businessName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: 'NY',
    zip: '',
    timeZone: 'America/New_York',
  })

  useEffect(() => {
    fetch('/api/admin/settings/company-info')
      .then((r) => r.json())
      .then((d) => { if (d.settings) setForm(d.settings) })
  }, [])

  const handleSave = async () => {
    const res = await fetch('/api/admin/settings/company-info', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) toast.success('Saved')
    else toast.error('Failed to save')
  }

  return (
    <div className="p-4 max-w-2xl">
      <h1 className="text-xl font-bold text-dark mb-6">Company Info</h1>
      <div className="bg-white rounded shadow p-6 space-y-4">
        {Object.entries(form).map(([key, value]) => (
          <div key={key}>
            <label className="block text-sm font-medium mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
            <input
              value={value}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
        ))}
        <button onClick={handleSave} className="btn-admin">Save</button>
      </div>
    </div>
  )
}
