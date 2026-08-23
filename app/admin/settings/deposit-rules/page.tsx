'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export default function DepositRulesPage() {
  const [rule, setRule] = useState({ type: 'percentage', amount: 25, isActive: true })

  useEffect(() => {
    fetch('/api/deposit-rule')
      .then((r) => r.json())
      .then((d) => { if (d.rule) setRule(d.rule) })
  }, [])

  const handleSave = async () => {
    const res = await fetch('/api/admin/settings/deposit-rules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    })
    if (res.ok) toast.success('Deposit rule saved')
    else toast.error('Failed to save')
  }

  return (
    <div className="p-4 max-w-md">
      <h1 className="text-xl font-bold text-dark mb-6">Deposit Rules</h1>
      <div className="bg-white rounded shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select value={rule.type} onChange={(e) => setRule({ ...rule, type: e.target.value })} className="w-full border rounded px-3 py-2 text-sm">
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed Amount</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Amount {rule.type === 'percentage' ? '(%)' : '($)'}
          </label>
          <input
            type="number"
            value={rule.amount}
            onChange={(e) => setRule({ ...rule, amount: parseFloat(e.target.value) })}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <button onClick={handleSave} className="btn-admin">Save</button>
      </div>
    </div>
  )
}
