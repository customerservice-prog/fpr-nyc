'use client'

import { useEffect, useState, type DragEvent } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

interface Item {
  id: string
  name: string
  type: string
  cost: number
  quantity: number
  displayToCustomer: boolean
  category: { name: string }
}

interface CategoryOption {
  id: string
  name: string
}

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [orderDirty, setOrderDirty] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)
  const perPage = 100

  const loadItems = () => {
    const params = new URLSearchParams({ page: String(page) })
    if (search) params.set('search', search)
    if (categoryFilter) {
      params.set('categoryId', categoryFilter)
      params.set('perPage', '500')
    }
    fetch(`/api/admin/items?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items || [])
        setTotal(d.total || 0)
        setOrderDirty(false)
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadItems()
  }, [page, search, categoryFilter])

  useEffect(() => {
    fetch('/api/admin/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch(() => {})
  }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/items/${id}`, { method: 'DELETE' })
      if (res.ok) {
        loadItems()
      } else {
        alert('Failed to delete item.')
      }
    } catch {
      alert('Failed to delete item.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDragStart = (index: number) => {
    if (!categoryFilter) return
    setDragIndex(index)
  }

  const handleDragOver = (e: DragEvent<HTMLTableRowElement>, index: number) => {
    if (!categoryFilter || dragIndex === null || dragIndex === index) return
    e.preventDefault()
  }

  const handleDrop = (e: DragEvent<HTMLTableRowElement>, index: number) => {
    if (!categoryFilter || dragIndex === null || dragIndex === index) return
    e.preventDefault()
    const next = [...items]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(index, 0, moved)
    setItems(next)
    setDragIndex(null)
    setOrderDirty(true)
  }

  const handleSaveOrder = async () => {
    setSavingOrder(true)
    try {
      const res = await fetch('/api/admin/items/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: items.map((i) => i.id) }),
      })
      if (res.ok) {
        setOrderDirty(false)
      } else {
        alert('Failed to save order.')
      }
    } catch {
      alert('Failed to save order.')
    } finally {
      setSavingOrder(false)
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-dark">Items</h1>
        <Link href="/admin/items/new" className="btn-admin">Add New</Link>
      </div>

      <div className="flex gap-2 mb-4 border-b pb-2">
        <button className="text-sm font-medium text-admin-green border-b-2 border-admin-green pb-1">Browse Mode</button>
        <button className="text-sm text-gray-400 pb-1">Spreadsheet Mode</button>
        <button className="text-sm text-gray-400 pb-1">Import & Export Mode</button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-2">
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-2 flex-1 min-w-[200px]"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">All Categories (browse)</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {categoryFilter && (
          <button
            onClick={handleSaveOrder}
            disabled={!orderDirty || savingOrder}
            className="btn-admin disabled:opacity-50"
          >
            {savingOrder ? 'Saving...' : 'Save Order'}
          </button>
        )}
        <span className="text-sm text-gray-500 ml-auto">
          {items.length} of {total} records
        </span>
      </div>

      {categoryFilter && (
        <p className="text-xs text-gray-500 mb-2">Drag rows by the ⠿ handle to set the order customers see on the category page, then click Save Order.</p>
      )}

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-admin-green text-white">
            <tr>
              <th className="px-3 py-2 w-8"></th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-right">Cost</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-center">Display</th>
              <th className="px-3 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr
                key={item.id}
                draggable={Boolean(categoryFilter)}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                className={`border-b hover:bg-gray-50 ${categoryFilter ? 'cursor-move' : ''}`}
              >
                <td className="px-3 py-2 text-gray-300">⠿</td>
                <td className="px-3 py-2 font-medium">{item.name}</td>
                <td className="px-3 py-2">{item.type}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(item.cost)}</td>
                <td className="px-3 py-2 text-right">{item.quantity}</td>
                <td className="px-3 py-2">{item.category.name}</td>
                <td className="px-3 py-2 text-center">{item.displayToCustomer ? '✓' : '✗'}</td>
                <td className="px-3 py-2 text-center">
                  <Link href={`/admin/items/${item.id}`} className="text-admin-gold hover:underline text-xs mr-2">Edit</Link>
                  <button
                    onClick={() => handleDelete(item.id, item.name)}
                    disabled={deletingId === item.id}
                    className="text-red-600 hover:underline text-xs disabled:opacity-50"
                  >
                    {deletingId === item.id ? 'Deleting...' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
