'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import ItemPhotosEditor from '@/components/admin/ItemPhotosEditor'

interface Category {
  id: string
  name: string
}

interface AddonItem {
  id: string
  name: string
}

export default function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [allItems, setAllItems] = useState<AddonItem[]>([])
  const [addonSearch, setAddonSearch] = useState('')
  const [photoBusy, setPhotoBusy] = useState(false)
  const [form, setForm] = useState({
    name: '',
    specialDisplayName: '',
    description: '',
    type: 'Regular',
    cost: '',
    quantity: '',
    categoryId: '',
    picture: '',
    additionalImages: [] as string[], colorOptions: '',
    displayToCustomer: true,
    status: 'Available',
    attentionNotes: '',
    lastInspectedAt: '',
    bookableAfter: '',
    bookableAfterMessage: '',
    sku: '',
    setupArea: '',
    actualSize: '',
    attendants: '',
    ageGroup: '',
    setupFee: '',
    taxable: true,
    internalNotes: '',
    suggestedAddonIds: [] as string[],
  })

  useEffect(() => {
    fetch('/api/admin/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))

    fetch('/api/admin/items?perPage=500')
      .then((r) => r.json())
      .then((d) => setAllItems((d.items || []).map((i: any) => ({ id: i.id, name: i.name }))))

    fetch(`/api/admin/items/${id}`)
      .then((r) => r.json())
      .then((d) => {
        const item = d.item
        setForm({
          name: item.name,
          specialDisplayName: item.specialDisplayName || '',
          description: item.description || '',
          type: item.type,
          cost: String(item.cost),
          quantity: String(item.quantity),
          categoryId: item.categoryId,
          status: item.status || 'Available',
          attentionNotes: item.attentionNotes || '',
          lastInspectedAt: item.lastInspectedAt ? String(item.lastInspectedAt).slice(0, 10) : '',
          picture: item.picture || '',
          additionalImages: Array.isArray(item.additionalImages) ? item.additionalImages : [], colorOptions: (item.colorOptions || []).join(', '),
          displayToCustomer: item.displayToCustomer,
          bookableAfter: item.bookableAfter ? String(item.bookableAfter).slice(0, 10) : '',
          bookableAfterMessage: item.bookableAfterMessage || '',
          sku: item.sku || '',
          setupArea: item.setupArea || '',
          actualSize: item.actualSize || '',
          attendants: item.attendants !== null && item.attendants !== undefined ? String(item.attendants) : '',
          ageGroup: item.ageGroup || '',
          setupFee: item.setupFee !== null && item.setupFee !== undefined ? String(item.setupFee) : '',
          taxable: item.taxable ?? true,
          internalNotes: item.internalNotes || '',
          suggestedAddonIds: item.suggestedAddonIds || [],
        })
      })
  }, [id])

  const toggleAddon = (id: string) => {
    setForm((f) => ({
      ...f,
      suggestedAddonIds: f.suggestedAddonIds.includes(id)
        ? f.suggestedAddonIds.filter((x) => x !== id)
        : [...f.suggestedAddonIds, id],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch(`/api/admin/items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        additionalImages: form.additionalImages,
        colorOptions: form.colorOptions.split(',').map((s) => s.trim()).filter(Boolean),
      }),
    })
    if (res.ok) {
      toast.success('Item updated')
      router.push('/admin/items')
    } else toast.error('Failed to update')
  }

  const filteredAddons = allItems.filter((i) =>
    i.name.toLowerCase().includes(addonSearch.toLowerCase())
  )

  return (
    <div className="p-4 max-w-2xl">
      <h1 className="text-xl font-bold text-dark mb-6">Edit Item</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Special Display Name (optional)</label>
          <input value={form.specialDisplayName} onChange={(e) => setForm({ ...form, specialDisplayName: e.target.value })} placeholder="Customer-facing name, if different from Name" className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="w-full border rounded px-3 py-2" />
        </div>
        <ItemPhotosEditor
          picture={form.picture}
          additionalImages={form.additionalImages}
          onPictureChange={(picture) => setForm((current) => ({ ...current, picture }))}
          onAdditionalImagesChange={(next) => setForm((current) => ({
            ...current,
            additionalImages: typeof next === 'function' ? next(current.additionalImages) : next,
          }))}
          onBusyChange={setPhotoBusy}
        />
        <div>
          <label className="block text-sm font-medium mb-1">Color Options (optional)</label>
          <input value={form.colorOptions} onChange={(e) => setForm({ ...form, colorOptions: e.target.value })} placeholder="Comma-separated list of colors, e.g. Black, White, Red" className="w-full border rounded px-3 py-2" />
          <p className="text-xs text-body mt-1">If set, customers pick a color from this list instead of needing a separate photo per color.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Cost</label>
            <input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Quantity</label>
            <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="w-full border rounded px-3 py-2" required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full border rounded px-3 py-2" required>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">SKU (optional)</label>
            <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Setup Fee (optional)</label>
            <input type="number" step="0.01" value={form.setupFee} onChange={(e) => setForm({ ...form, setupFee: e.target.value })} className="w-full border rounded px-3 py-2" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Setup Area (optional)</label>
            <input value={form.setupArea} onChange={(e) => setForm({ ...form, setupArea: e.target.value })} placeholder="e.g. 22ft x 22ft clearance" className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Actual Size (optional)</label>
            <input value={form.actualSize} onChange={(e) => setForm({ ...form, actualSize: e.target.value })} placeholder="e.g. 15ft L x 15ft W x 16ft H" className="w-full border rounded px-3 py-2" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Attendants Required (optional)</label>
            <input type="number" value={form.attendants} onChange={(e) => setForm({ ...form, attendants: e.target.value })} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Recommended Age Group (optional)</label>
            <input value={form.ageGroup} onChange={(e) => setForm({ ...form, ageGroup: e.target.value })} placeholder="e.g. Ages 5-12" className="w-full border rounded px-3 py-2" />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.displayToCustomer} onChange={(e) => setForm({ ...form, displayToCustomer: e.target.checked })} />
            Display to Customer
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.taxable} onChange={(e) => setForm({ ...form, taxable: e.target.checked })} />
            Taxable
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Internal Notes (optional, staff only)</label>
          <textarea value={form.internalNotes} onChange={(e) => setForm({ ...form, internalNotes: e.target.value })} rows={2} className="w-full border rounded px-3 py-2" />
        </div>
        <div className="border-t pt-4">
          <label className="block text-sm font-medium mb-1">Suggested Add-Ons (optional)</label>
          <input value={addonSearch} onChange={(e) => setAddonSearch(e.target.value)} placeholder="Search items to suggest as add-ons..." className="w-full border rounded px-3 py-2 mb-2" />
          <div className="border rounded max-h-48 overflow-y-auto p-2 space-y-1">
            {filteredAddons.map((i) => (
              <label key={i.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.suggestedAddonIds.includes(i.id)} onChange={() => toggleAddon(i.id)} />
                {i.name}
              </label>
            ))}
            {filteredAddons.length === 0 && <p className="text-xs text-body">No items found</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border rounded px-3 py-2">
              <option value="Available">Available</option>
              <option value="Damaged">Damaged</option>
              <option value="Needs Repair">Needs Repair</option>
              <option value="Missing">Missing</option>
              <option value="Out of Service">Out of Service</option>
              <option value="Retired">Retired</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last Inspected</label>
            <input type="date" value={form.lastInspectedAt} onChange={(e) => setForm({ ...form, lastInspectedAt: e.target.value })} className="w-full border rounded px-3 py-2" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Attention Notes</label>
          <textarea value={form.attentionNotes} onChange={(e) => setForm({ ...form, attentionNotes: e.target.value })} rows={3} placeholder="Describe any damage or issue that needs attention" className="w-full border rounded px-3 py-2" />
        </div>
        <div className="border-t pt-4">
          <label className="block text-sm font-medium mb-1">Block Bookings Until (optional)</label>
          <input type="date" value={form.bookableAfter} onChange={(e) => setForm({ ...form, bookableAfter: e.target.value })} className="w-full border rounded px-3 py-2" />
          <p className="text-xs text-body mt-1">If set, customers will see this item as unavailable for any event date before this date. Leave blank to allow booking any time.</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Restriction Message (optional)</label>
          <input value={form.bookableAfterMessage} onChange={(e) => setForm({ ...form, bookableAfterMessage: e.target.value })} placeholder="e.g. Back in stock August 5th" className="w-full border rounded px-3 py-2" />
        </div>
        <button type="submit" disabled={photoBusy} className="btn-admin disabled:opacity-50">{photoBusy ? 'Uploading Photos…' : 'Save Changes'}</button>
      </form>
    </div>
  )
}
