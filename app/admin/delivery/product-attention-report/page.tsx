'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface AttentionItem {
  id: string
  name: string
  category: string
  attentionNotes: string | null
  lastInspectedAt: string | null
}

interface Group {
  status: string
  items: AttentionItem[]
}

function statusColor(status: string) {
  switch (status) {
    case 'Damaged':
      return 'bg-red-100 text-red-700'
    case 'Needs Repair':
      return 'bg-amber-100 text-amber-700'
    case 'Missing':
      return 'bg-purple-100 text-purple-700'
    case 'Out of Service':
      return 'bg-gray-200 text-gray-700'
    case 'Retired':
      return 'bg-gray-100 text-gray-500'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export default function ProductAttentionReportPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/reports/product-attention')
      .then((r) => r.json())
      .then((d) => {
        setGroups(d.groups || [])
        setTotalCount(d.totalCount || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-4 max-w-4xl">
      <Link href="/admin/delivery" className="text-secondary text-sm hover:underline mb-4 block no-print">← Back to Delivery</Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-dark">Product Attention Report</h1>
        <button onClick={() => window.print()} className="border px-3 py-1 rounded text-sm no-print">Print</button>
      </div>

      <p className="text-sm text-body mb-4">{totalCount} item(s) need attention</p>

      {loading ? (
        <p className="text-sm text-body">Loading...</p>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded shadow p-4 text-sm text-body">No items currently need attention. Everything is marked Available.</div>
      ) : (
        groups.map((group) => (
          <div key={group.status} className="bg-white rounded shadow p-4 mb-4">
            <h2 className="font-bold text-dark mb-3">
              <span className={`inline-block px-2 py-1 rounded text-xs font-semibold mr-2 ${statusColor(group.status)}`}>{group.status}</span>
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left">Item</th>
                  <th className="py-2 text-left">Category</th>
                  <th className="py-2 text-left">Notes</th>
                  <th className="py-2 text-right">Last Inspected</th>
                  <th className="py-2 text-right no-print">Edit</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2">{item.name}</td>
                    <td className="py-2">{item.category}</td>
                    <td className="py-2 text-body">{item.attentionNotes || '—'}</td>
                    <td className="py-2 text-right">{item.lastInspectedAt ? new Date(item.lastInspectedAt).toLocaleDateString() : '—'}</td>
                    <td className="py-2 text-right no-print">
                      <Link href={`/admin/items/${item.id}`} className="text-secondary hover:underline text-xs">Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  )
}
