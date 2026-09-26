'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export default function TaxRatePage() {
  const [rate, setRate] = useState({ rate: 8, isActive: true })

  useEffect(() => {
    fetch('/api/tax-rate')
      .then((r) => r.json())
      .then((d) => { if (d.rate) setRate(d.rate) })
  }, [])

  const handleSave = async () => {
    const res = await fetch('/api/admin/settings/tax-rate', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rate),
    })
    if (res.ok) toast.success('Tax rate saved')
    else toast.error('Failed to save')
  }

  return (
    <div className="p-4 max-w-md">
      <h1 className="text-xl font-bold text-dark mb-6">Tax Rate</h1>
      <div className="bg-white rounded shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Sales Tax Rate (%)</label>
          <input
            type="number"
            step="0.01"
            value={rate.rate}
            onChange={(e) => setRate({ ...rate, rate: parseFloat(e.target.value) })}
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">Applied to subtotal (after coupon discount) plus delivery fee at checkout.</p>
        </div>
        <button onClick={handleSave} className="btn-admin">Save</button>
      </div>
    </div>
  )
}
