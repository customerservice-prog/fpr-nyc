'use client'

import { useEffect, useState } from 'react'

interface Stop {
  id: string
  orderNumber: string
  customerName: string
  isDelivery: boolean
  isPickup: boolean
  items: Array<{ itemName: string; quantity: number }>
}

function toDateInputValue(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function DriverLoadSheetPage() {
  const [date, setDate] = useState(toDateInputValue(new Date()))
  const [stops, setStops] = useState<Stop[]>([])
  const [loading, setLoading] = useState(true)
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setLoading(true)
    fetch(`/api/driver/orders?date=${date}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setStops(d.stops || [])
      })
      .finally(() => setLoading(false))

    const saved = localStorage.getItem('loadSheetChecked_' + date)
    setChecked(saved ? JSON.parse(saved) : {})
  }, [date])

  const toggle = (name: string) => {
    setChecked((prev) => {
      const next = { ...prev, [name]: !prev[name] }
      localStorage.setItem('loadSheetChecked_' + date, JSON.stringify(next))
      return next
    })
  }

  const deliveryStops = stops.filter((s) => s.isDelivery)
  const pickupStops = stops.filter((s) => s.isPickup)

  const aggregated: Record<string, number> = {}
  deliveryStops.forEach((s) => {
    s.items.forEach((i) => {
      aggregated[i.itemName] = (aggregated[i.itemName] || 0) + i.quantity
    })
  })
  const aggregatedList = Object.entries(aggregated).sort((a, b) => a[0].localeCompare(b[0]))

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Load Sheet</h1>
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
          <h2 className="text-sm font-semibold text-gray-600 mb-2">
            Items to load ({deliveryStops.length} deliver{deliveryStops.length === 1 ? 'y' : 'ies'})
          </h2>
          <div className="bg-white rounded shadow divide-y mb-6">
            {aggregatedList.length === 0 && (
              <p className="p-4 text-sm text-gray-500">No delivery items for this date.</p>
            )}
            {aggregatedList.map(([name, qty]) => (
              <label key={name} className="flex items-center gap-3 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={!!checked[name]}
                  onChange={() => toggle(name)}
                  className="w-5 h-5"
                />
                <span className={checked[name] ? 'line-through text-gray-400 flex-1' : 'flex-1'}>{name}</span>
                <span className="font-semibold">x{qty}</span>
              </label>
            ))}
          </div>

          <h2 className="text-sm font-semibold text-gray-600 mb-2">
            Pickups today ({pickupStops.length})
          </h2>
          <div className="bg-white rounded shadow divide-y">
            {pickupStops.length === 0 && (
              <p className="p-4 text-sm text-gray-500">No pickups for this date.</p>
            )}
            {pickupStops.map((s) => (
              <div key={s.id} className="p-3 text-sm">
                <p className="font-medium">{s.orderNumber} &middot; {s.customerName}</p>
                <p className="text-gray-500">{s.items.map((i) => `${i.itemName} x${i.quantity}`).join(', ')}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
