'use client'

import { useEffect, useState } from 'react'

interface WeddingPackage {
  id: string
  name: string
  description: string | null
  price: number
  guests: number
  image: string | null
  items: string[]
  popular: boolean
  signature: boolean
  sortOrder: number
  isActive: boolean
}

const emptyForm = {
  id: '',
  name: '',
  description: '',
  price: 0,
  guests: 0,
  image: '',
  items: '',
  popular: false,
  signature: false,
  sortOrder: 0,
  isActive: true,
}

export default function AdminWeddingPackagesPage() {
  const [packages, setPackages] = useState<WeddingPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<any>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/admin/wedding-packages')
      .then((res) => res.json())
      .then((data) => setPackages(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const startEdit = (pkg: WeddingPackage) => {
    setEditingId(pkg.id)
    setForm({
      id: pkg.id,
      name: pkg.name,
      description: pkg.description || '',
      price: pkg.price,
      guests: pkg.guests,
      image: pkg.image || '',
      items: (pkg.items || []).join(', '),
      popular: pkg.popular,
      signature: pkg.signature,
      sortOrder: pkg.sortOrder,
      isActive: pkg.isActive,
    })
  }

  const startNew = () => {
    setEditingId('new')
    setForm(emptyForm)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(emptyForm)
  }

  const save = async () => {
    const payload = {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      guests: Number(form.guests),
      image: form.image,
      items: form.items.split(',').map((s: string) => s.trim()).filter(Boolean),
      popular: form.popular,
      signature: form.signature,
      sortOrder: Number(form.sortOrder),
      isActive: form.isActive,
    }
    if (editingId === 'new') {
      await fetch('/api/admin/wedding-packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else if (editingId) {
      await fetch('/api/admin/wedding-packages/' + editingId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }
    cancelEdit()
    load()
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this wedding package?')) return
    await fetch('/api/admin/wedding-packages/' + id, { method: 'DELETE' })
    load()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-dark">Wedding Packages</h1>
        <button onClick={startNew} className="btn-primary">Add New Package</button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-4">
          {packages.map((pkg) => (
            <div key={pkg.id} className="border rounded-lg p-4 bg-white">
              {editingId === pkg.id ? (
                <EditForm form={form} setForm={setForm} onSave={save} onCancel={cancelEdit} />
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-dark">{pkg.name} {pkg.popular && <span className="text-xs bg-secondary text-white px-2 py-0.5 rounded ml-2">MOST POPULAR</span>} {pkg.signature && <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded ml-2">SIGNATURE</span>}</p>
                    <p className="text-body text-sm">${pkg.price} - up to {pkg.guests} guests {!pkg.isActive && '(hidden)'}</p>
                    <p className="text-body text-xs mt-1">{(pkg.items || []).join(', ')}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(pkg)} className="btn-accent">Edit</button>
                    <button onClick={() => remove(pkg.id)} className="text-red-600 border border-red-600 rounded px-3 py-1">Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {editingId === 'new' && (
            <div className="border rounded-lg p-4 bg-white">
              <EditForm form={form} setForm={setForm} onSave={save} onCancel={cancelEdit} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EditForm({ form, setForm, onSave, onCancel }: any) {
  return (
    <div className="grid md:grid-cols-2 gap-3">
      <div>
        <label className="block text-sm font-medium text-dark mb-1">Name</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium text-dark mb-1">Price</label>
        <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium text-dark mb-1">Guests</label>
        <input type="number" value={form.guests} onChange={(e) => setForm({ ...form, guests: e.target.value })} className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium text-dark mb-1">Sort Order</label>
        <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} className="w-full border rounded px-3 py-2" />
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-dark mb-1">Description</label>
        <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border rounded px-3 py-2" />
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-dark mb-1">Image URL</label>
        <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className="w-full border rounded px-3 py-2" />
        <div className="mt-2">
          <label className="block text-xs text-gray-500 mb-1">Or upload an image (auto-resized)</label>
          <input type="file" accept="image/*" onChange={(e) => {
            const file = e.target.files && e.target.files[0]
            if (!file) return
            const reader = new FileReader()
            reader.onload = (ev) => {
              const img = new window.Image()
              img.onload = async () => {
                const maxW = 800
                const scale = Math.min(1, maxW / img.width)
                const canvas = document.createElement('canvas')
                canvas.width = Math.round(img.width * scale)
                canvas.height = Math.round(img.height * scale)
                const ctx = canvas.getContext('2d')
                if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
                // Upload the resized image to object storage and store the
                // hosted URL. Falls back to the inline data URL on failure.
                try {
                  const blob = await (await fetch(dataUrl)).blob()
                  const body = new FormData()
                  body.append('file', blob, 'wedding-package.jpg')
                  const res = await fetch('/api/admin/upload', { method: 'POST', body })
                  if (res.ok) {
                    const data = await res.json()
                    setForm((f: any) => ({ ...f, image: data.url }))
                    return
                  }
                } catch {
                  // fall through to inline data URL below
                }
                setForm((f: any) => ({ ...f, image: dataUrl }))
              }
              img.src = ev.target?.result as string
            }
            reader.readAsDataURL(file)
          }} className="w-full text-sm" />
        </div>
        {form.image ? (
          <img src={form.image} alt="Preview" className="mt-2 h-32 rounded object-cover border" />
        ) : null}
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-dark mb-1">Items (comma separated)</label>
        <input value={form.items} onChange={(e) => setForm({ ...form, items: e.target.value })} className="w-full border rounded px-3 py-2" />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={form.popular} onChange={(e) => setForm({ ...form, popular: e.target.checked })} />
        <label className="text-sm text-dark">Most Popular</label>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={form.signature} onChange={(e) => setForm({ ...form, signature: e.target.checked })} />
        <label className="text-sm text-dark">Signature</label>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
        <label className="text-sm text-dark">Active (visible on site)</label>
      </div>
      <div className="md:col-span-2 flex gap-2 mt-2">
        <button onClick={onSave} className="btn-primary">Save</button>
        <button onClick={onCancel} className="border rounded px-4 py-2">Cancel</button>
      </div>
    </div>
  )
}
