'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface Coupon {
  id: string
  code: string
  discountType: string
  discountAmount: number
  expiresAt?: string
  isActive: boolean
}

const emptyForm = {
  code: '',
  discountType: 'percentage',
  discountAmount: '',
  expiresAt: '',
  isActive: true,
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    fetch('/api/admin/coupons')
      .then((r) => r.json())
      .then((d) => setCoupons(d.coupons || []))
  }, [])

  const handleAdd = async () => {
    if (!form.code || !form.discountAmount) {
      toast.error('Code and amount are required')
      return
    }
    const res = await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const d = await res.json()
      setCoupons([d.coupon, ...coupons])
      setForm(emptyForm)
      toast.success('Coupon created')
    } else {
      toast.error('Failed to create coupon')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this coupon? This cannot be undone.')) return
    const res = await fetch(`/api/admin/coupons?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setCoupons(coupons.filter((c) => c.id !== id))
      toast.success('Coupon deleted')
    } else {
      toast.error('Failed to delete coupon')
    }
  }

  const handleToggleActive = async (c: Coupon) => {
    const res = await fetch('/api/admin/coupons', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id, isActive: !c.isActive }),
    })
    if (res.ok) {
      setCoupons(coupons.map((x) => (x.id === c.id ? { ...x, isActive: !x.isActive } : x)))
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-dark mb-6">Coupons</h1>
      <div className="bg-white rounded shadow p-4 mb-6 grid grid-cols-2 gap-3">
        <input placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="border rounded px-3 py-2 text-sm" />
        <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })} className="border rounded px-3 py-2 text-sm">
          <option value="percentage">Percentage (%)</option>
          <option value="fixed">Fixed ($)</option>
        </select>
        <input placeholder="Amount" type="number" value={form.discountAmount} onChange={(e) => setForm({ ...form, discountAmount: e.target.value })} className="border rounded px-3 py-2 text-sm" />
        <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="border rounded px-3 py-2 text-sm" />
        <button onClick={handleAdd} className="btn-admin col-span-2">Add Coupon</button>
      </div>
      <div className="bg-white rounded shadow">
        {coupons.map((c) => (
          <div key={c.id} className="flex justify-between items-center border-b px-4 py-3 text-sm gap-3">
            <span className="font-medium">{c.code}</span>
            <span>{c.discountType === 'percentage' ? `${c.discountAmount}%` : `$${c.discountAmount}`}</span>
            <span>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'No expiration'}</span>
            <button onClick={() => handleToggleActive(c)} className={c.isActive ? 'text-green-600' : 'text-gray-400'}>
              {c.isActive ? 'Active' : 'Inactive'}
            </button>
            <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700">Delete</button>
          </div>
        ))}
      </div>
    </div>
  )
}
