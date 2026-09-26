'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Driver {
  id: string
  name: string
}

export default function DriverLoginPage() {
  const router = useRouter()
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [driverId, setDriverId] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/driver/list')
      .then((r) => r.json())
      .then((d) => setDrivers(d.drivers || []))
      .catch(() => {})
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!driverId || !pin) {
      setError('Please select your name and enter your PIN')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/driver/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId, pin }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login failed')
        setLoading(false)
        return
      }
      router.push('/driver')
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form onSubmit={submit} className="bg-white rounded shadow p-6 w-full max-w-sm">
        <h1 className="text-xl font-bold text-center mb-4">Driver Login</h1>
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <label className="block text-sm text-gray-600 mb-1">Your Name</label>
        <select
          value={driverId}
          onChange={(e) => setDriverId(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-4"
        >
          <option value="">Select your name</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <label className="block text-sm text-gray-600 mb-1">PIN</label>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-4"
          placeholder="Enter your PIN"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-700 text-white rounded px-3 py-2 font-semibold disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
    </div>
  )
}
