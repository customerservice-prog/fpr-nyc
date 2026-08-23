'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Stop {
  id: string
  orderNumber: string
  eventAddress?: string
  eventCity?: string
  eventState?: string
  eventZip?: string
  eventTimeSlot?: string
  pickupTimeSlot?: string
  customerName: string
  customerPhone?: string
  items: Array<{ itemName: string; quantity: number }>
  isDelivery: boolean
  isPickup: boolean
  routeSequence: number | null
  pickupRouteSequence: number | null
      deliveryPhoto: string | null
      pickupPhoto: string | null
  deliveredAt: string | null
  pickedUpAt: string | null
  notes?: string
}

function toDateInputValue(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const SHARE_PREF_KEY = 'driverShareLocation'

export default function DriverRoutePage() {
  const router = useRouter()
  const [date, setDate] = useState(toDateInputValue(new Date()))
  const [driverName, setDriverName] = useState('')
  const [stops, setStops] = useState<Stop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sharingLocation, setSharingLocation] = useState(false)
  const [locationStatus, setLocationStatus] = useState('')
  const watchIdRef = useRef<number | null>(null)
      const fileInputRef = useRef<HTMLInputElement>(null)
      const pendingPhotoRef = useRef<{ orderId: string; action: 'delivered' | 'pickedUp' } | null>(null)

  const [installPrompt, setInstallPrompt] = useState<any>(null)

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const installApp = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  const load = () => {
    setLoading(true)
    fetch(`/api/driver/orders?date=${date}`)
      .then(async (r) => {
        if (r.status === 401) {
          router.push('/driver/login')
          return null
        }
        return r.json()
      })
      .then((d) => {
        if (!d) return
        setDriverName(d.driver?.name || '')
        setStops(d.stops || [])
      })
      .catch(() => setError('Could not load your route.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  const sendLocation = (lat: number, lng: number) => {
    fetch('/api/driver/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng }),
    }).catch(() => {})
  }

  const stopSharing = () => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setSharingLocation(false)
    setLocationStatus('')
    try {
      localStorage.setItem(SHARE_PREF_KEY, 'off')
    } catch {}
  }

  const startSharing = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationStatus('Location is not supported on this device.')
      return
    }
    setSharingLocation(true)
    try {
      localStorage.setItem(SHARE_PREF_KEY, 'on')
    } catch {}
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setLocationStatus('Sharing location \u2713')
        sendLocation(pos.coords.latitude, pos.coords.longitude)
      },
      () => {
        setLocationStatus('Could not get your location. Check location permissions.')
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    )
    watchIdRef.current = id
  }

  useEffect(() => {
    let wantsSharing = false
    try {
      wantsSharing = localStorage.getItem(SHARE_PREF_KEY) === 'on'
    } catch {}
    if (wantsSharing) {
      startSharing()
    }
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const markComplete = async (orderId: string, action: 'delivered' | 'pickedUp', photo?: string) => {
    await fetch('/api/driver/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, action , photo}),
    })
    load()
  }

      const requestPhoto = (orderId: string, action: 'delivered' | 'pickedUp') => {
              pendingPhotoRef.current = { orderId, action }
              fileInputRef.current?.click()
      }

      const handlePhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
              const file = e.target.files?.[0]
              const pending = pendingPhotoRef.current
              e.target.value = ''
              if (!file || !pending) return
              const reader = new FileReader()
              reader.onload = () => {
                        markComplete(pending.orderId, pending.action, reader.result as string)
                        pendingPhotoRef.current = null
              }
              reader.readAsDataURL(file)
      }

  const logout = async () => {
    stopSharing()
    await fetch('/api/driver/login', { method: 'DELETE' })
    router.push('/driver/login')
  }

  const sorted = [...stops].sort((a, b) => {
    const aSeq = a.routeSequence ?? a.pickupRouteSequence ?? 999
    const bSeq = b.routeSequence ?? b.pickupRouteSequence ?? 999
    return aSeq - bSeq
  })

  return (
    <div className="min-h-screen bg-gray-100 p-4">
            <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      style={{ display: 'none' }}
                      onChange={handlePhotoSelected}
                    />
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold">Hi, {driverName || 'Driver'}</h1>
          <p className="text-sm text-gray-500">{loading ? 'Loading...' : `${sorted.length} stop(s) today`}</p>
        </div>
        {installPrompt && (
        <button onClick={installApp} className="text-sm px-3 py-2 rounded font-semibold bg-green-700 text-white mr-2">
          Install App
        </button>
      )}
      <button onClick={logout} className="text-sm px-3 py-2 border rounded bg-white">
          Log Out
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {!sharingLocation ? (
          <button onClick={startSharing} className="text-sm px-3 py-2 rounded font-semibold bg-blue-600 text-white">
            Share My Location
          </button>
        ) : (
          <button onClick={stopSharing} className="text-sm px-3 py-2 rounded font-semibold bg-gray-200 text-gray-800">
            Stop Sharing Location
          </button>
        )}
        {locationStatus && <span className="text-xs text-gray-500">{locationStatus}</span>}
      </div>

      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="border rounded px-3 py-2 text-sm mb-4 bg-white"
      />

      {error && <p className="text-red-600 mb-3">{error}</p>}

      <div className="space-y-3">
        {sorted.map((s, idx) => (
          <div key={s.id} className="bg-white rounded shadow p-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-200 mr-2">Stop #{idx + 1}</span>
                {s.isDelivery && <span className="text-xs font-semibold px-2 py-0.5 rounded bg-green-100 text-green-700 mr-1">Delivery</span>}
                {s.isPickup && <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700">Pickup</span>}
                <p className="font-medium mt-1">{s.orderNumber} &middot; {s.customerName}</p>
                <p className="text-sm text-gray-600">
                  {s.eventAddress}{s.eventCity ? `, ${s.eventCity}` : ''} {s.eventState} {s.eventZip}
                </p>
                <a
                  href={
                    'https://www.google.com/maps/dir/?api=1&destination=' +
                    encodeURIComponent(
                      [s.eventAddress, s.eventCity, s.eventState, s.eventZip].filter(Boolean).join(' ')
                    )
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 underline mr-3"
                >
                  Navigate
                </a>
                {s.eventTimeSlot && (
                  <p className="text-xs text-gray-500 mt-1">Delivery time: {s.eventTimeSlot}</p>
                )}
                {s.pickupTimeSlot && (
                  <p className="text-xs text-gray-500 mt-1">Pickup time: {s.pickupTimeSlot}</p>
                )}
                {s.customerPhone && (
                  <a href={`tel:${s.customerPhone}`} className="text-sm text-blue-600 underline">
                    {s.customerPhone}
                  </a>
                )}
                {s.items.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {s.items.map((i) => `${i.itemName} x${i.quantity}`).join(', ')}
                  </p>
                )}
                {s.notes && <p className="text-xs text-amber-700 mt-1">Note: {s.notes}</p>}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t flex gap-2">
              {s.isDelivery && (
                <button
                  onClick={() => markComplete(s.id, 'delivered')}
                  disabled={!!s.deliveredAt}
                  className={`text-sm px-3 py-2 rounded font-semibold ${s.deliveredAt ? 'bg-green-100 text-green-700' : 'bg-green-700 text-white'}`}
                >
                  {s.deliveredAt ? 'Delivered \u2713' : 'Mark Delivered'}
                </button>
              )}
              {s.isDelivery && (
                            <button
                                                onClick={() => requestPhoto(s.id, 'delivered')}
                                                className="text-sm px-3 py-2 rounded font-semibold border bg-white"
                                              >
                              {s.deliveryPhoto ? 'Photo \u2713 (retake)' : '\ud83d\udcf7 Add Photo'}
                            </button>
                          )}
              {s.isPickup && (
                <button
                  onClick={() => markComplete(s.id, 'pickedUp')}
                  disabled={!!s.pickedUpAt}
                  className={`text-sm px-3 py-2 rounded font-semibold ${s.pickedUpAt ? 'bg-red-100 text-red-700' : 'bg-red-700 text-white'}`}
                >
                  {s.pickedUpAt ? 'Picked Up \u2713' : 'Mark Picked Up'}
                </button>
              )}
              {s.isPickup && (
                            <button
                                                onClick={() => requestPhoto(s.id, 'pickedUp')}
                                                className="text-sm px-3 py-2 rounded font-semibold border bg-white"
                                              >
                              {s.pickupPhoto ? 'Photo \u2713 (retake)' : '\ud83d\udcf7 Add Photo'}
                                            
                                          </button>
                          )}
            </div>
          </div>
        ))}
        {!loading && sorted.length === 0 && (
                    <p className="text-gray-400">No stops for this date.</p>
        )}
      </div>
    </div>
  )
}
