'use client'

import { useEffect, useState } from 'react'

type PageCount = {
  page: string
  users: number
}

type TopPage = {
  path: string
  title: string
  views: number
  users: number
}

type TodayTotals = {
  pageViews: number
  visitors: number
  sessions: number
}

type RealtimeData = {
  connected: boolean
  activeNow: number
  activeByPage: PageCount[]
  today: TodayTotals | null
  last24h: {
    activeUsers: number
    sessions: number
    pageViews: number
  } | null
  topPages: TopPage[]
  generatedAt?: string
}

const REFRESH_MS = 10000

function formatTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function LiveVisitorCount() {
  const [data, setData] = useState<RealtimeData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/admin/google-analytics/realtime', {
          cache: 'no-store',
        })
        const json = (await res.json()) as RealtimeData
        if (!cancelled) {
          setData(json)
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    const id = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  if (loading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">Loading live visitors…</p>
      </div>
    )
  }

  if (!data || !data.connected) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">
          Live visitor data is not available right now.
        </p>
      </div>
    )
  }

  const { activeNow, activeByPage, today, last24h, topPages, generatedAt } = data
  const updated = formatTime(generatedAt)

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Live Visitors
        </h3>
        <span className="flex items-center gap-1 text-sm font-medium text-green-600">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          Live
        </span>
      </div>

      <p className="mt-3">
        <span className="text-4xl font-bold text-gray-900">{activeNow}</span>{' '}
        <span className="text-gray-500">
          {activeNow === 1 ? 'person' : 'people'} on the site now
        </span>
      </p>

      {activeByPage.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Active now by page
          </p>
          <ul className="mt-2 divide-y divide-gray-100">
            {activeByPage.map((p) => (
              <li
                key={p.page}
                className="flex items-center justify-between py-1.5 text-sm"
              >
                <span className="truncate pr-3 text-gray-700">{p.page}</span>
                <span className="font-semibold text-gray-900">{p.users}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {today && (
        <div className="mt-6 rounded-md bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Today so far
          </p>
          <div className="mt-2 grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">
                Page Views
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {today.pageViews}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">
                Visitors
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {today.visitors}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">
                Sessions
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {today.sessions}
              </p>
            </div>
          </div>
        </div>
      )}

      {last24h && (
        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">
              Visitors (24h)
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {last24h.activeUsers}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">
              Sessions (24h)
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {last24h.sessions}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">
              Page Views (24h)
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {last24h.pageViews}
            </p>
          </div>
        </div>
      )}

      {topPages.length > 0 && (
        <div className="mt-6 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Top pages (today)
          </p>
          <ul className="mt-2 divide-y divide-gray-100">
            {topPages.map((p) => (
              <li key={p.path} className="py-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-medium text-gray-800">
                    {p.title || p.path}
                  </span>
                  <span className="whitespace-nowrap font-semibold text-gray-900">
                    {p.views} views
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs text-gray-400">
                  <span className="truncate">{p.path}</span>
                  <span className="whitespace-nowrap">
                    {p.users} {p.users === 1 ? 'visitor' : 'visitors'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-400">
        Updates every 10 seconds{updated ? ' · last updated ' + updated : ''}
      </p>
    </div>
  )
}
