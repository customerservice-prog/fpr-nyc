'use client'

import { useEffect, useState } from 'react'

interface Stop {
  id: string
  orderNumber: string
  customerName: string
  eventAddress?: string
  eventCity?: string
  eventState?: string
  eventZip?: string
  isDelivery: boolean
  isPickup: boolean
  deliveredAt: string | null
  pickedUpAt: string | null
}

function toDateInputValue(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function DriverTasksPage() {
  const [date, setDate] = useState(toDateInputValue(new Date()))
  const [stops, setStops] = useState<Stop[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/driver/orders?date=${date}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setStops(d.stops || [])
      })
      .finally(() => setLoading(false))
  }, [date])

  const tasks = stops.flatMap((s) => {
    const list: Array<{ key: string; label: string; done: boolean; address: string }> = []
    const address = [s.eventAddress, s.eventCity, s.eventState, s.eventZip].filter(Boolean).join(', ')
    if (s.isDelivery) {
      list.push({ key: s.id + '-d', label: `Deliver to ${s.customerName} (${s.orderNumber})`, done: !!s.deliveredAt, address })
    }
    if (s.isPickup) {
      list.push({ key: s.id + '-p', label: `Pick up from ${s.customerName} (${s.orderNumber})`, done: !!s.pickedUpAt, address })
    }
    return list
  })

  const doneCount = tasks.filter((t) => t.done).length

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Tasks</h1>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border rounded px-2 py-1"
        />
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-2">{doneCount} of {tasks.length} complete</p>
          <div className="bg-white rounded shadow divide-y">
            {tasks.length === 0 && <p className="p-4 text-sm text-gray-500">No tasks for this date.</p>}
            {tasks.map((t) => (
              <div key={t.key} className="p-3 flex items-start gap-3">
                <input type="checkbox" checked={t.done} readOnly className="w-5 h-5 mt-0.5" />
                <div>
                  <p className={t.done ? 'line-through text-gray-400 text-sm font-medium' : 'text-sm font-medium'}>{t.label}</p>
                  <p className="text-xs text-gray-500">{t.address}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Manage delivery/pickup completion, photos, and navigation from the Home screen.
          </p>
        </>
      )}
    </div>
  )
}
