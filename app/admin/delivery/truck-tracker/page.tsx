'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

interface DriverLoc {
  id: string
  name: string
  vehicleInfo: string | null
  lat: number | null
  lng: number | null
  recordedAt: string | null
}

interface StopItem {
  itemName: string
  quantity: number
}

interface Stop {
  id: string
  orderNumber: string
  type: 'delivery' | 'pickup'
  address: string
  customerName: string
  driverName: string | null
  timeSlot: string | null
  actualAt: string | null
  eventEndDate: string | null
  notes: string | null
  contractSigned: boolean
  setupSurface: string | null
  isPublicPark: boolean
  items: StopItem[]
  routeSequence: number | null
  lat: number | null
  lng: number | null
}

const SYRACUSE_CENTER: [number, number] = [43.0481, -76.1474]
const ROUTE_COLORS = ['#1e3a8a', '#7c3aed', '#0d9488', '#b45309', '#be185d', '#4338ca', '#0369a1', '#65a30d']

function groupStopsByDriver(stops: Stop[]) {
  const map: Record<string, Stop[]> = {}
  stops.forEach((s) => {
    const key = s.driverName || 'Unassigned'
    if (!map[key]) map[key] = []
    map[key].push(s)
  })
  const names = Object.keys(map).sort((a, b) => {
    if (a === 'Unassigned') return 1
    if (b === 'Unassigned') return -1
    return a.localeCompare(b)
  })
  names.forEach((name) => {
    map[name].sort((a, b) => (a.routeSequence ?? 9999) - (b.routeSequence ?? 9999))
  })
  return { map, names }
}

function formatFallbackTime(eventDate: string | null | undefined): string | null {
  if (!eventDate) return null
  const d = new Date(eventDate)
  const h = d.getUTCHours()
  const m = d.getUTCMinutes()
  if (h === 0 && m === 0) return null
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  const mm = m.toString().padStart(2, '0')
  return h12 + ':' + mm + ' ' + period
}

function formatActualTime(iso: string | null | undefined): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

const SLOT_LABELS: Record<string, string> = {
  morning: 'Morning (8am - 12pm)',
  afternoon: 'Afternoon (12pm - 7pm)',
  evening: 'Evening Drop-off (4pm - 8pm)',
  overnight: 'Overnight Rental',
  same_evening: 'Same Day Evening Pickup',
  next_morning: 'Next Day Morning Pickup',
  next_afternoon: 'Next Day Afternoon Pickup',
}

function formatSlotLabel(slot: string | null | undefined): string | null {
  if (!slot) return null
  if (SLOT_LABELS[slot]) return SLOT_LABELS[slot]
  const exactMatch = slot.match(/^exact_(\d{2})(\d{2})$/)
  if (exactMatch) {
    const h = parseInt(exactMatch[1], 10)
    const mm = exactMatch[2]
    const period = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 === 0 ? 12 : h % 12
    return `Exact Time: ${h12}:${mm} ${period}`
  }
  return slot
}

function itemsSummary(items: StopItem[]): string {
  if (!items || items.length === 0) return 'No items listed'
  const shown = items.slice(0, 2).map((i) => `${i.itemName} x${i.quantity}`).join(', ')
  return items.length > 2 ? `${shown} +${items.length - 2} more` : shown
}

async function geocodeAddress(address: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`)
    const data = await res.json()
    if (data && data[0]) return [parseFloat(data[0].lat), parseFloat(data[0].lon)]
  } catch {}
  return null
}

export default function TruckTrackerPage() {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const stopMarkersRef = useRef<any[]>([])
  const geocodeCache = useRef<Record<string, [number, number]>>({})
  const [date, setDate] = useState('')
  const [drivers, setDrivers] = useState<DriverLoc[]>([])
  const [stops, setStops] = useState<Stop[]>([])
  const [loading, setLoading] = useState(true)
  const [stopsLoading, setStopsLoading] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setDate(params.get('date') || '')
  }, [])

  // Load Leaflet from CDN (no build-time dependency needed)
  useEffect(() => {
    if ((window as any).L) {
      setMapReady(true)
      return
    }
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.async = true
    script.onload = () => setMapReady(true)
    document.body.appendChild(script)
  }, [])

  useEffect(() => {
    if (!mapReady || !mapRef.current || leafletMapRef.current) return
    const L = (window as any).L
    leafletMapRef.current = L.map(mapRef.current).setView(SYRACUSE_CENTER, 11)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(leafletMapRef.current)
  }, [mapReady])

  useEffect(() => {
    const load = () => {
      fetch('/api/admin/truck-tracker')
        .then((r) => r.json())
        .then((d) => setDrivers(d.drivers || []))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  // Automatically load this day's stops as soon as a date is present - no manual driver assignment required
  useEffect(() => {
    if (!date) return
    let cancelled = false
    setStopsLoading(true)
    fetch(`/api/admin/delivery?date=${date}&status=all`)
      .then((r) => r.json())
      .then(async (d) => {
        const orders = d.orders || []
        const built: Stop[] = []
        for (const o of orders) {
          const address = [o.eventAddress, o.eventCity, o.eventState, o.eventZip].filter(Boolean).join(', ')
          if (!address) continue
          let coords = geocodeCache.current[address]
          if (!coords) {
            const found = await geocodeAddress(address)
            if (found) {
              coords = found
              geocodeCache.current[address] = found
            }
          }
          const isPickup = o.deliveryType === 'pickup'
          built.push({
            id: o.id,
            orderNumber: o.orderNumber,
            type: isPickup ? 'pickup' : 'delivery',
            address,
            customerName: `${o.customer?.firstName || ''} ${o.customer?.lastName || ''}`.trim(),
            driverName: isPickup ? o.pickupDriverName : o.driverName,
            timeSlot: o.eventTimeSlot || formatFallbackTime(o.eventDate),
            actualAt: isPickup ? o.pickedUpAt : o.deliveredAt,
            eventEndDate: o.eventEndDate || null,
            notes: o.notes || null,
            contractSigned: !!o.contractSignedAt,
            setupSurface: o.setupSurface || null,
            isPublicPark: !!o.isPublicPark,
            items: (o.items || []).map((i: any) => ({ itemName: i.itemName, quantity: i.quantity })),
            routeSequence: isPickup ? o.pickupRouteSequence : o.routeSequence,
            lat: coords ? coords[0] : null,
            lng: coords ? coords[1] : null,
          })
        }
        if (!cancelled) setStops(built)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setStopsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [date])
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return
    const L = (window as any).L
    markersRef.current.forEach((m) => leafletMapRef.current.removeLayer(m))
    markersRef.current = []
    drivers.forEach((d) => {
      if (d.lat == null || d.lng == null) return
      const marker = L.marker([d.lat, d.lng]).addTo(leafletMapRef.current)
      const when = d.recordedAt ? new Date(d.recordedAt).toLocaleString() : 'Unknown'
      marker.bindPopup(`<strong>${d.name}</strong><br/>${d.vehicleInfo || ''}<br/>Last update: ${when}`)
      markersRef.current.push(marker)
    })
  }, [drivers, mapReady])

  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return
    const L = (window as any).L
    stopMarkersRef.current.forEach((m) => leafletMapRef.current.removeLayer(m))
    stopMarkersRef.current = []
    const { names } = groupStopsByDriver(stops)
    stops.forEach((s) => {
      if (s.lat == null || s.lng == null) return
      const groupIdx = names.indexOf(s.driverName || 'Unassigned')
      const color = ROUTE_COLORS[groupIdx % ROUTE_COLORS.length]
      const icon = L.divIcon({
        html: `<div style="background:${color};color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.5);">${groupIdx + 1}</div>`,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })
      const marker = L.marker([s.lat, s.lng], { icon }).addTo(leafletMapRef.current)
      marker.bindPopup(`<strong>${s.orderNumber}</strong><br/>${s.type === 'pickup' ? 'Pickup' : 'Delivery'}<br/>${s.customerName}<br/>${s.address}${s.timeSlot ? `<br/>Time: ${formatSlotLabel(s.timeSlot)}` : ''}<br/>Driver: ${s.driverName || 'Unassigned'}`)
      stopMarkersRef.current.push(marker)
    })
  }, [stops, mapReady])

  const withLocation = drivers.filter((d) => d.lat != null && d.lng != null)
  const { map: stopGroups, names: groupNames } = groupStopsByDriver(stops)

  return (
    <div className="p-4 max-w-7xl">
      <Link href="/admin/delivery" className="text-secondary text-sm hover:underline mb-4 block">← Back to Delivery</Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-dark">Truck Tracker{date ? ` — ${date}` : ''}</h1>
      </div>

      {date && stopsLoading && (
        <div className="bg-blue-50 border border-blue-300 rounded p-3 text-sm text-blue-800 mb-4">
          Loading this day's stops automatically...
        </div>
      )}

      {!loading && withLocation.length === 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded p-3 text-sm text-amber-800 mb-4">
          No live truck locations yet. Drivers need to enable location sharing from the driver app for their trucks to appear here.
        </div>
      )}

      <div className="bg-white rounded shadow overflow-hidden mb-4" style={{ height: '500px' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </div>

      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold text-dark mb-3">Drivers ({drivers.length})</h2>
        <div className="flex flex-wrap gap-4">
          {drivers.map((d) => (
            <div key={d.id} className="text-sm border rounded p-2 min-w-[160px]">
              <p className="font-medium">{d.name}</p>
              {d.vehicleInfo && <p className="text-body text-xs">{d.vehicleInfo}</p>}
              <p className="text-body text-xs">{d.lat != null ? `Last seen: ${d.recordedAt ? new Date(d.recordedAt).toLocaleString() : 'Unknown'}` : 'No location shared yet'}</p>
            </div>
          ))}
          {drivers.length === 0 && (
            <p className="text-sm text-body">No active drivers found.</p>
          )}
        </div>
      </div>

      {date && (
        <div className="space-y-4">
          {groupNames.map((name, idx) => (
            <div key={name} className="bg-white rounded shadow overflow-hidden">
              <div className="flex">
                <div className="text-white font-bold flex flex-col items-center justify-center w-20 shrink-0 p-2 text-center" style={{ background: ROUTE_COLORS[idx % ROUTE_COLORS.length] }}>
                  <span className="text-xl">{idx + 1}</span><span className="text-[10px] font-normal mt-1">{formatSlotLabel(stopGroups[name][0]?.timeSlot) || ''}</span>
                </div>
                <div className="w-44 shrink-0 p-3 border-r bg-gray-50">
                  <p className="font-semibold text-sm">{name}</p>
                  <p className="text-xs text-body">{stopGroups[name].length} stop{stopGroups[name].length === 1 ? '' : 's'} today</p>
                </div>
                <div className="flex-1 overflow-x-auto">
                  <div className="flex">
                    {stopGroups[name].map((s) => (
                      <div key={s.id} className="w-64 shrink-0 p-3 border-r text-sm bg-green-50 relative"><Link href={`/admin/orders/${s.id}`} className="absolute top-1 right-1 text-secondary hover:underline text-xs" title="Edit order">✎</Link>
                        <p className="font-semibold">{formatSlotLabel(s.timeSlot) || 'No time set'}</p>
                        <p className="truncate">{s.customerName}</p>
                        <p className="text-xs text-body truncate">{s.address}</p>
                        {s.eventEndDate && (<p className="text-xs text-gray-500">Through {new Date(s.eventEndDate).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}</p>)}
                        {s.notes && (<p className="text-xs bg-yellow-100 text-yellow-900 rounded px-1 py-0.5 mt-1">{s.notes}</p>)}
                        {s.setupSurface && (<p className="text-xs text-gray-500">Surface: {s.setupSurface}</p>)}
                        {s.isPublicPark && (<p className="text-xs text-red-600 font-semibold">Public Park - generator required</p>)}
                        <div className="text-xs text-body space-y-0.5">{s.items.map((it, i) => (<div key={i}>{it.itemName} x{it.quantity}</div>))}</div>
                        <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded" style={{ background: s.type === 'pickup' ? '#fee2e2' : '#dcfce7', color: s.type === 'pickup' ? '#dc2626' : '#16a34a' }}>{s.orderNumber} · {s.type === 'pickup' ? 'Pickup' : 'Delivery'}</span>{s.contractSigned && (<span className="inline-block mt-2 ml-1 text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: '#9ca3af', color: '#fff' }} title="Contract signed">C</span>)}{s.actualAt && (<p className="text-xs font-bold text-green-700 mt-1">✓ {formatActualTime(s.actualAt)}</p>)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {groupNames.length === 0 && !stopsLoading && (
            <p className="text-sm text-body">No stops scheduled for this date.</p>
          )}
        </div>
      )}
    </div>
  )
}
