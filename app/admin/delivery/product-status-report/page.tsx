'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Row {
  orderId: string
  orderNumber: string
  itemName: string
  quantity: number
}

interface CategoryGroup {
  category: string
  rows: Row[]
}

function todayStr() {
  const d = new Date()
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tz).toISOString().slice(0, 10)
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tz).toISOString().slice(0, 10)
}

export default function ProductStatusReportPage() {
  const [date, setDate] = useState(todayStr())
  const [categories, setCategories] = useState<CategoryGroup[]>([])
  const [orderCount, setOrderCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/reports/product-status?date=${date}`)
      .then((r) => r.json())
      .then((d) => {
        setCategories(d.categories || [])
        setOrderCount(d.orderCount || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [date])

  return (
    <div className="p-4 max-w-4xl">
      <Link href="/admin/delivery" className="text-secondary text-sm hover:underline mb-4 block no-print">← Back to Delivery</Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-dark">Product Status Report</h1>
        <button onClick={() => window.print()} className="border px-3 py-1 rounded text-sm no-print">Print</button>
      </div>

      <div className="flex items-center gap-3 mb-6 no-print">
        <button onClick={() => setDate(addDays(date, -1))} className="border px-3 py-1 rounded text-sm">← Prev</button>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border rounded px-3 py-1 text-sm"
        />
        <button onClick={() => setDate(addDays(date, 1))} className="border px-3 py-1 rounded text-sm">Next →</button>
        <button onClick={() => setDate(todayStr())} className="border px-3 py-1 rounded text-sm">Today</button>
      </div>

      <p className="text-sm text-body mb-4">{orderCount} order(s) scheduled for {date}</p>

      {loading ? (
        <p className="text-sm text-body">Loading...</p>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded shadow p-4 text-sm text-body">No items scheduled for this date.</div>
      ) : (
        categories.map((group) => (
          <div key={group.category} className="bg-white rounded shadow p-4 mb-4">
            <h2 className="font-bold text-dark mb-3">{group.category}</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left">Order</th>
                  <th className="py-2 text-left">Item</th>
                  <th className="py-2 text-right">Qty</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-2">
                      <Link href={`/admin/orders/${row.orderId}`} className="text-secondary hover:underline">{row.orderNumber}</Link>
                    </td>
                    <td className="py-2">{row.itemName}</td>
                    <td className="py-2 text-right">{row.quantity}</td>
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
