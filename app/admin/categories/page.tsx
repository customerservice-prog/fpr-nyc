'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/utils'

interface CategoryRow {
  id: string
  name: string
  slug: string
  displayToCustomer: boolean
  description?: string
  pricingProfile?: string
  picture?: string | null
  items: Array<{ id: string }>
}

export default function CategoriesAdminPage() {
  const [categories, setCategories] = useState<CategoryRow[]>([])

  useEffect(() => {
    fetch('/api/admin/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
  }, [])

  const updatePricingProfile = async (id: string, pricingProfile: string) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, pricingProfile } : c)))
    const res = await fetch('/api/admin/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, pricingProfile }),
    })
    if (res.ok) toast.success('Pricing profile updated')
    else toast.error('Failed to update pricing profile')
  }

  const updatePicture = async (id: string, picture: string) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, picture } : c)))
    const res = await fetch('/api/admin/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, picture }),
    })
    if (res.ok) toast.success('Category image updated')
    else toast.error('Failed to update category image')
  }

  const updateNameLocal = (id: string, name: string) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)))
  }

  const saveName = async (id: string, name: string) => {
    const res = await fetch('/api/admin/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name }),
    })
    if (res.ok) toast.success('Category name updated')
    else toast.error('Failed to update category name')
  }

  const updateDescriptionLocal = (id: string, description: string) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, description } : c)))
  }

  const saveDescription = async (id: string, description: string) => {
    const res = await fetch('/api/admin/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, description }),
    })
    if (res.ok) toast.success('Category description updated')
    else toast.error('Failed to update category description')
  }

  const handlePictureFile = async (id: string, file: File | undefined) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert('Please choose an image smaller than 5MB')
      return
    }
    // Upload to object storage and store the hosted URL. Falls
    // back to an inline data URL if storage is not configured.
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body })
      if (res.ok) {
        const data = await res.json()
        updatePicture(id, data.url)
        return
      }
    } catch {
      // fall through to inline data URL below
    }
    const reader = new FileReader()
    reader.onload = () => {
      updatePicture(id, reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-dark mb-2">Categories</h1>
      <p className="text-sm text-body mb-6">
        Pricing Profile controls which multi-day rental rules apply. &quot;Tables/Tents/Chairs&quot; also
        enables Overnight, Flexible Delivery, and Exact Time special request fees at checkout. Upload an
        image below to control the photo shown for that category on the public site.
      </p>
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-admin-green text-white">
            <tr>
              <th className="px-4 py-3 text-left">Image</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Slug</th>
              <th className="px-4 py-3 text-center">Display</th>
              <th className="px-4 py-3 text-right">Items</th>
              <th className="px-4 py-3 text-left">Pricing Profile</th>
              <th className="px-4 py-3 text-left">Description</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">
                  {cat.picture && (
                    <img
                      src={cat.picture}
                      alt={cat.name}
                      className="h-12 w-12 object-cover rounded border mb-1"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  )}
                  <label className="inline-block text-xs font-medium bg-gray-100 hover:bg-gray-200 border rounded px-2 py-1 cursor-pointer">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePictureFile(cat.id, e.target.files?.[0])}
                    />
                  </label>
                </td>
                <td className="px-4 py-3 font-medium">
                  <input
                    type="text"
                    value={cat.name}
                    onChange={(e) => updateNameLocal(cat.id, e.target.value)}
                    onBlur={(e) => saveName(cat.id, e.target.value)}
                    className="border rounded px-2 py-1 text-xs w-40"
                  />
                </td>
                <td className="px-4 py-3 text-body">{cat.slug}</td>
                <td className="px-4 py-3 text-center">{cat.displayToCustomer ? '✓' : '✗'}</td>
                <td className="px-4 py-3 text-right">{cat.items.length}</td>
                <td className="px-4 py-3">
                  <select
                    value={cat.pricingProfile || 'standard'}
                    onChange={(e) => updatePricingProfile(cat.id, e.target.value)}
                    className="border rounded px-2 py-1 text-xs"
                  >
                    <option value="standard">Standard</option>
                    <option value="tables_tents">Tables/Tents/Chairs</option>
                    <option value="bounce_waterslide">Bounce House/Waterslide</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-body text-xs max-w-xs">
                  <input
                    type="text"
                    value={cat.description || ''}
                    onChange={(e) => updateDescriptionLocal(cat.id, e.target.value)}
                    onBlur={(e) => saveDescription(cat.id, e.target.value)}
                    className="border rounded px-2 py-1 text-xs w-full"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
