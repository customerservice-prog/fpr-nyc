'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface Tier {
  id: string
  label: string
  minDays: number
  maxDays: number | null
  percent: number
  sortOrder: number
}

export default function PricingTiersPage() {
  const [tiers, setTiers] = useState<Tier[]>([])

  const load = () => {
    fetch('/api/admin/pricing-tiers')
      .then((r) => r.json())
      .then((d) => setTiers(d.tiers || []))
  }

  useEffect(() => {
    load()
  }, [])

  const updateTier = (id: string, field: keyof Tier, value: string) => {
    setTiers((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: field === 'label' ? value : (value === '' ? null : Number(value)) } : t)))
  }

  const saveTier = async (tier: Tier) => {
    const res = await fetch('/api/admin/pricing-tiers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tier),
    })
    if (res.ok) toast.success(`${tier.label} saved`)
    else toast.error('Failed to save')
  }

  return (
    <div className="p-4 max-w-3xl">
      <h1 className="text-xl font-bold text-dark mb-2">Multi-Day Pricing Tiers</h1>
      <p className="text-sm text-body mb-6">
        Controls the percentage markup applied to the rental subtotal based on how many days the
        customer rents for. These mirror the tiers configured in ERS (2-3 Days: +50%, 4-6 Days: +100%,
        7+ Days: +150%) and apply to every category.
      </p>
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-admin-green text-white">
            <tr>
              <th className="px-4 py-3 text-left">Label</th>
              <th className="px-4 py-3 text-right">Min Days</th>
              <th className="px-4 py-3 text-right">Max Days</th>
              <th className="px-4 py-3 text-right">Percent Markup</th>
              <th className="px-4 py-3 text-center">Save</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier) => (
              <tr key={tier.id} className="border-b">
                <td className="px-4 py-2">
                  <input
                    value={tier.label}
                    onChange={(e) => updateTier(tier.id, 'label', e.target.value)}
                    className="border rounded px-2 py-1 text-sm w-32"
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number"
                    value={tier.minDays}
                    onChange={(e) => updateTier(tier.id, 'minDays', e.target.value)}
                    className="border rounded px-2 py-1 text-sm w-20 text-right"
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number"
                    value={tier.maxDays ?? ''}
                    placeholder="none"
                    onChange={(e) => updateTier(tier.id, 'maxDays', e.target.value)}
                    className="border rounded px-2 py-1 text-sm w-20 text-right"
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number"
                    value={tier.percent}
                    onChange={(e) => updateTier(tier.id, 'percent', e.target.value)}
                    className="border rounded px-2 py-1 text-sm w-20 text-right"
                  />
                  <span className="ml-1">%</span>
                </td>
                <td className="px-4 py-2 text-center">
                  <button onClick={() => saveTier(tier)} className="btn-admin text-xs px-3 py-1">Save</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
