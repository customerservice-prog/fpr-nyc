'use client'

import { useEffect, useState } from 'react'

interface TimeEntry {
  id: string
  clockIn: string
  clockOut: string | null
}

function formatDuration(startIso: string, endIso: string | null) {
  const start = new Date(startIso).getTime()
  const end = endIso ? new Date(endIso).getTime() : Date.now()
  const totalMinutes = Math.max(0, Math.floor((end - start) / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes}m`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function DriverClockPage() {
  const [openEntry, setOpenEntry] = useState<TimeEntry | null>(null)
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [tick, setTick] = useState(0)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/driver/clock')
      const data = await res.json()
      setOpenEntry(data.openEntry || null)
      setTodayEntries(data.todayEntries || [])
    } catch (e) {
      // ignore
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const clockIn = async () => {
    setBusy(true)
    await fetch('/api/driver/clock', { method: 'POST' })
    await load()
    setBusy(false)
  }

  const clockOut = async () => {
    setBusy(true)
    await fetch('/api/driver/clock', { method: 'PATCH' })
    await load()
    setBusy(false)
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-xl font-bold mb-4">Clock In / Out</h1>

      <div className="bg-white rounded shadow p-6 text-center mb-4">
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : openEntry ? (
          <>
            <p className="text-sm text-gray-500 mb-1">Clocked in since {formatTime(openEntry.clockIn)}</p>
            <p className="text-3xl font-bold text-green-700 mb-4">{formatDuration(openEntry.clockIn, null)}</p>
            <button
              onClick={clockOut}
              disabled={busy}
              className="w-full bg-red-600 text-white font-semibold py-3 rounded text-lg disabled:opacity-50"
            >
              Clock Out
            </button>
          </>
        ) : (
          <>
            <p className="text-gray-500 mb-4">You are not clocked in.</p>
            <button
              onClick={clockIn}
              disabled={busy}
              className="w-full bg-green-700 text-white font-semibold py-3 rounded text-lg disabled:opacity-50"
            >
              Clock In
            </button>
          </>
        )}
      </div>

      <h2 className="text-sm font-semibold text-gray-600 mb-2">Today&apos;s Entries</h2>
      <div className="bg-white rounded shadow divide-y">
        {todayEntries.length === 0 && (
          <p className="p-4 text-sm text-gray-500">No entries yet today.</p>
        )}
        {todayEntries.map((e) => (
          <div key={e.id} className="p-3 flex justify-between text-sm">
            <span>
              {formatTime(e.clockIn)} - {e.clockOut ? formatTime(e.clockOut) : 'now'}
            </span>
            <span className="font-medium">{formatDuration(e.clockIn, e.clockOut)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
