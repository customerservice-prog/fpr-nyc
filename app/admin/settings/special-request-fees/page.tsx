'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { isLegacySchedulingSpecialRequestFee } from '@/lib/publicSpecialRequestFees'

interface Fee {
  id: string
  name: string
  amount: number
  isActive: boolean
  sortOrder: number
}

export default function SpecialRequestFeesPage() {
  const [fees, setFees] = useState<Fee[]>([])

  useEffect(() => {
    fetch('/api/admin/special-request-fees')
      .then((r) => r.json())
      .then((d) => setFees(d.fees || []))
  }, [])

  const updateFee = (id: string, field: keyof Fee, value: string | boolean) => {
    setFees((prev) => prev.map((f) => (f.id === id ? { ...f, [field]: value } : f)))
  }

  const saveFee = async (fee: Fee) => {
    const res = await fetch('/api/admin/special-request-fees', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fee),
    })
    if (res.ok) toast.success(`${fee.name} saved`)
    else toast.error('Failed to save')
  }

  return (
    <div className="p-4 max-w-3xl">
      <h1 className="text-xl font-bold text-dark mb-2">Special Request Fees</h1>
      <p className="text-sm text-body mb-6">
        These are legacy/special-request add-ons. Current Event Time / Delivery Time / Pickup Time
        scheduling uses included 2-hour delivery windows, $50 guaranteed exact delivery, flexible pickup,
        requested-by pickup, and the current exact-pickup tiers. Fees whose names describe delivery, pickup,
        or exact-time scheduling are automatically hidden from the public checkout so customers are not charged twice.
      </p>
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-admin-green text-white">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-center">Active</th>
              <th className="px-4 py-3 text-center">Save</th>
            </tr>
          </thead>
          <tbody>
            {fees.map((fee) => (
              <tr key={fee.id} className="border-b">
                <td className="px-4 py-2">
                  <input
                    value={fee.name}
                    onChange={(e) => updateFee(fee.id, 'name', e.target.value)}
                    className="border rounded px-2 py-1 text-sm w-48"
                  />
                  {isLegacySchedulingSpecialRequestFee(fee.name) && (
                    <div className="mt-1 text-[11px] font-semibold text-amber-700">Hidden from public checkout — current scheduler handles this.</div>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={fee.amount}
                    onChange={(e) => updateFee(fee.id, 'amount', e.target.value)}
                    className="border rounded px-2 py-1 text-sm w-24 text-right"
                  />
                </td>
                <td className="px-4 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={fee.isActive}
                    onChange={(e) => updateFee(fee.id, 'isActive', e.target.checked)}
                  />
                </td>
                <td className="px-4 py-2 text-center">
                  <button onClick={() => saveFee(fee)} className="btn-admin text-xs px-3 py-1">Save</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
