'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'

interface ServiceArea {
  id: string
  city: string
  state: string
  zip: string
  region?: string
  baseFee: number
}

export default function ServiceAreasPage() {
  const [areas, setAreas] = useState<ServiceArea[]>([])
  const [form, setForm] = useState({ city: '', zip: '', region: '', baseFee: '0' })

  useEffect(() => {
    fetch('/api/admin/service-areas')
      .then((r) => r.json())
      .then((d) => setAreas(d.areas || []))
  }, [])

  const handleAdd = async () => {
    const res = await fetch('/api/admin/service-areas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const d = await res.json()
      setAreas([...areas, d.area])
      setForm({ city: '', zip: '', region: '', baseFee: '0' })
      toast.success('Area added')
    }
  }

  const handleDelete = async (id: string) => {
    await fetch('/api/admin/service-areas', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setAreas(areas.filter((a) => a.id !== id))
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-dark mb-6">Service Areas</h1>
      <div className="bg-white rounded shadow p-4 mb-6 grid grid-cols-4 gap-3">
        <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="border rounded px-3 py-2 text-sm" />
        <input placeholder="Zip" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} className="border rounded px-3 py-2 text-sm" />
        <input placeholder="Region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="border rounded px-3 py-2 text-sm" />
        <input placeholder="Base Fee" type="number" value={form.baseFee} onChange={(e) => setForm({ ...form, baseFee: e.target.value })} className="border rounded px-3 py-2 text-sm" />
        <button onClick={handleAdd} className="btn-admin col-span-4">Add Area</button>
      </div>
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-admin-green text-white">
            <tr>
              <th className="px-4 py-2 text-left">City</th>
              <th className="px-4 py-2 text-left">Zip</th>
              <th className="px-4 py-2 text-left">Region</th>
              <th className="px-4 py-2 text-right">Base Fee</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {areas.map((a) => (
              <tr key={a.id} className="border-b">
                <td className="px-4 py-2">{a.city}</td>
                <td className="px-4 py-2">{a.zip}</td>
                <td className="px-4 py-2">{a.region || '—'}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(a.baseFee)}</td>
                <td className="px-4 py-2">
                  <button onClick={() => handleDelete(a.id)} className="text-red-500 text-xs hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
