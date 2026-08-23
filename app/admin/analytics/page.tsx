'use client'

import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import LiveVisitorCount from '@/components/admin/LiveVisitorCount'
import Link from 'next/link'

interface RankedItem { name: string; units: number; revenue: number; orders: number }
interface GeoRow { name: string; orders: number; revenue: number }
interface TrendRow { month: string; revenue: number; orders: number }
interface CustomerRow { name: string; orders: number; revenue: number }

interface AnalyticsData {
  generatedAt: string
  totals: {
    totalRevenue: number
    totalCollected: number
    totalOrders: number
    totalCustomers: number
    totalItems: number
    averageOrderValue: number
  }
  rankedByUnits: RankedItem[]
  rankedByRevenue: RankedItem[]
  revenueTrend: TrendRow[]
  topCities: GeoRow[]
  topStates: GeoRow[]
  deliveryMix: Array<{ type: string; count: number }>
  topCustomers: CustomerRow[]
  google: {
    measurementId: string
    analyticsConnected: boolean
    searchConsoleConnected: boolean
    analyticsUrl: string
    searchConsoleUrl: string
  }
}

function money(n: number) {
  return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="admin-card p-4">
      <p className="text-xs text-body uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-dark mt-1">{value}</p>
      {sub && <p className="text-xs text-body mt-1">{sub}</p>}
    </div>
  )
}

function RankTable({ title, rows, valueLabel, valueFn }: {
  title: string
  rows: RankedItem[]
  valueLabel: string
  valueFn: (r: RankedItem) => string
}) {
  return (
    <div className="admin-card p-4">
      <h2 className="admin-card-header">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-body text-sm">No data yet</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-body border-b">
              <th className="py-1 w-8">#</th>
              <th className="py-1">Item</th>
              <th className="py-1 text-right">{valueLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.name} className="border-b last:border-0">
                <td className="py-1 font-bold text-secondary">{i + 1}</td>
                <td className="py-1">{r.name}</td>
                <td className="py-1 text-right font-medium">{valueFn(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function GeoTable({ title, rows }: { title: string; rows: GeoRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.orders))
  return (
    <div className="admin-card p-4">
      <h2 className="admin-card-header">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-body text-sm">No data yet</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.name}>
              <div className="flex justify-between text-sm mb-1">
                <span>{r.name}</span>
                <span className="text-body">{r.orders} orders · {money(r.revenue)}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded">
                <div className="h-2 rounded" style={{ width: (r.orders / max) * 100 + '%', backgroundColor: '#4CAF50' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function GoogleCard({ title, connected, description, url, cta }: {
  title: string
  connected: boolean
  description: string
  url: string
  cta: string
}) {
  return (
    <div className="admin-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="admin-card-header mb-0">{title}</h2>
        <span className={'text-xs font-bold px-2 py-1 rounded ' + (connected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
          {connected ? 'Connected' : 'Not connected'}
        </span>
      </div>
      <p className="text-sm text-body mb-3">{description}</p>
      {!connected && (
        <p className="text-xs text-body mb-3">
          Live numbers appear here once server-side Google API credentials are configured. Until then, open the dashboard directly in Google.
        </p>
      )}
      <a href={url} target="_blank" rel="noopener noreferrer" className="btn-admin inline-block">{cta} &rarr;</a>
    </div>
  )
}

interface RealtimeData {
  activeNow: number
  pageviewsLast30Min: number
  perMinute: { minute: string; users: number }[]
  topPages: { path: string; users: number }[]
  byCity: { city: string; users: number }[]
  byDevice: { device: string; users: number }[]
  todayVisitors: number
  todayPageviews: number
  generatedAt: number
}

function RealtimeSection() {
  const [rt, setRt] = useState<RealtimeData | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    const load = () => {
      fetch('/api/admin/realtime')
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => {
          if (active) {
            setRt(d)
            setFailed(false)
          }
        })
        .catch(() => {
          if (active) setFailed(true)
        })
    }
    load()
    const id = setInterval(load, 5000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-dark flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
          Realtime &mdash; on the site now
        </h2>
        <span className="text-xs text-body">Live first-party data &middot; refreshes every 5s</span>
      </div>

      {failed && (
        <p className="text-sm text-body">
          Realtime data isn&apos;t available yet. It begins collecting as soon as visitors browse the
          site after this deploys.
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-3 border">
          <div className="text-3xl font-bold text-dark">{rt ? rt.activeNow : '\u2013'}</div>
          <div className="text-xs text-body mt-1">Active users right now</div>
        </div>
        <div className="bg-white rounded-lg p-3 border">
          <div className="text-3xl font-bold text-dark">{rt ? rt.pageviewsLast30Min : '\u2013'}</div>
          <div className="text-xs text-body mt-1">Page views (last 30 min)</div>
        </div>
        <div className="bg-white rounded-lg p-3 border">
          <div className="text-3xl font-bold text-dark">{rt ? rt.todayVisitors : '\u2013'}</div>
          <div className="text-xs text-body mt-1">Unique visitors today</div>
        </div>
        <div className="bg-white rounded-lg p-3 border">
          <div className="text-3xl font-bold text-dark">{rt ? rt.todayPageviews : '\u2013'}</div>
          <div className="text-xs text-body mt-1">Page views today</div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-3 border">
        <div className="text-xs text-body mb-2">Active users per minute (last 30 min)</div>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={rt ? rt.perMinute : []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="minute" tick={{ fontSize: 10 }} interval={4} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={24} />
            <Tooltip />
            <Line type="monotone" dataKey="users" stroke="#16a34a" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-3 border">
          <div className="text-sm font-semibold text-dark mb-2">Top active pages</div>
          {rt && rt.topPages.length > 0 ? (
            <ul className="text-sm space-y-1">
              {rt.topPages.map((p) => (
                <li key={p.path} className="flex justify-between gap-2">
                  <span className="truncate text-body">{p.path}</span>
                  <span className="font-semibold text-dark">{p.users}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-body">No active pages right now.</p>
          )}
        </div>
        <div className="bg-white rounded-lg p-3 border">
          <div className="text-sm font-semibold text-dark mb-2">Where they are (city)</div>
          {rt && rt.byCity.length > 0 ? (
            <ul className="text-sm space-y-1">
              {rt.byCity.map((c) => (
                <li key={c.city} className="flex justify-between gap-2">
                  <span className="truncate text-body">{c.city}</span>
                  <span className="font-semibold text-dark">{c.users}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-body">City data appears when visitor location is available.</p>
          )}
        </div>
        <div className="bg-white rounded-lg p-3 border">
          <div className="text-sm font-semibold text-dark mb-2">Devices</div>
          {rt && rt.byDevice.length > 0 ? (
            <ul className="text-sm space-y-1">
              {rt.byDevice.map((d) => (
                <li key={d.device} className="flex justify-between gap-2">
                  <span className="capitalize text-body">{d.device}</span>
                  <span className="font-semibold text-dark">{d.users}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-body">No active devices right now.</p>
          )}
        </div>
      </div>
    </div>
  )
}
interface GaData {
  connected: boolean
  reason?: string
  rangeDays: number
  totals: {
    sessions: number
    pageViews: number
    activeUsers: number
    newUsers: number
    engagementRate: number
    averageSessionDuration: number
  }
  byCountry: Array<{ name: string; sessions: number }>
  byCity: Array<{ name: string; sessions: number }>
  bySource: Array<{ name: string; sessions: number }>
  trend: Array<{ date: string; sessions: number; users: number }>
}

interface GscData {
  connected: boolean
  reason?: string
  rangeDays: number
  totals: { clicks: number; impressions: number; ctr: number; position: number }
  topQueries: Array<{
    query: string
    clicks: number
    impressions: number
    ctr: number
    position: number
  }>
}

function num(n: number) {
  return (n || 0).toLocaleString('en-US')
}

function pct(n: number) {
  return ((n || 0) * 100).toFixed(1) + '%'
}

function MiniList({ title, rows }: { title: string; rows: Array<{ name: string; sessions: number }> }) {
  return (
    <div>
      <p className="text-xs text-body uppercase tracking-wide mb-1">{title}</p>
      {rows.length === 0 && <p className="text-xs text-body">No data yet</p>}
      {rows.map((r) => (
        <div key={r.name} className="flex justify-between text-sm py-0.5">
          <span className="text-dark truncate pr-2">{r.name}</span>
          <span className="text-body">{num(r.sessions)}</span>
        </div>
      ))}
    </div>
  )
}

function GoogleAnalyticsSection({ fallbackUrl }: { fallbackUrl: string }) {
  const [ga, setGa] = useState<GaData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/google-analytics')
      .then((r) => r.json())
      .then((d) => setGa(d))
      .catch(() => setGa(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="admin-card p-4">
        <h2 className="admin-card-header mb-2">Website Traffic (Google Analytics)</h2>
        <p className="text-sm text-body">Loading live traffic...</p>
      </div>
    )
  }

  if (!ga || !ga.connected) {
    return (
      <GoogleCard
        title="Website Traffic (Google Analytics)"
        connected={false}
        description="Sessions, page views, active users, visitor geography and acquisition sources for friendlypartyrental.com."
        url={fallbackUrl}
        cta="Open Google Analytics"
      />
    )
  }

  return (
    <div className="admin-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="admin-card-header mb-0">Website Traffic (Google Analytics)</h2>
        <span className="text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-700">Connected</span>
      </div>
      <p className="text-xs text-body mb-3">Last {ga.rangeDays} days</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Sessions" value={num(ga.totals.sessions)} />
        <StatCard label="Page Views" value={num(ga.totals.pageViews)} />
        <StatCard label="Active Users" value={num(ga.totals.activeUsers)} />
        <StatCard label="New Users" value={num(ga.totals.newUsers)} />
      </div>
      {ga.trend.length > 0 && (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={ga.trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey="sessions" stroke="#16a34a" dot={false} name="Sessions" />
            <Line type="monotone" dataKey="users" stroke="#2563eb" dot={false} name="Users" />
          </LineChart>
        </ResponsiveContainer>
      )}
      <div className="grid md:grid-cols-3 gap-4 mt-4">
        <MiniList title="Top Visitor Cities" rows={ga.byCity} />
        <MiniList title="Top Countries" rows={ga.byCountry} />
        <MiniList title="Traffic Sources" rows={ga.bySource} />
      </div>
    </div>
  )
}

function SearchConsoleSection({ fallbackUrl }: { fallbackUrl: string }) {
  const [gsc, setGsc] = useState<GscData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/search-console')
      .then((r) => r.json())
      .then((d) => setGsc(d))
      .catch(() => setGsc(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="admin-card p-4">
        <h2 className="admin-card-header mb-2">Search Rankings (Search Console)</h2>
        <p className="text-sm text-body">Loading search data...</p>
      </div>
    )
  }

  if (!gsc || !gsc.connected) {
    return (
      <GoogleCard
        title="Search Rankings (Search Console)"
        connected={false}
        description="Search keyword rankings, impressions, click-through rate and the queries bringing visitors to your site."
        url={fallbackUrl}
        cta="Open Search Console"
      />
    )
  }

  return (
    <div className="admin-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="admin-card-header mb-0">Search Rankings (Search Console)</h2>
        <span className="text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-700">Connected</span>
      </div>
      <p className="text-xs text-body mb-3">Last {gsc.rangeDays} days</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Clicks" value={num(gsc.totals.clicks)} />
        <StatCard label="Impressions" value={num(gsc.totals.impressions)} />
        <StatCard label="CTR" value={pct(gsc.totals.ctr)} />
        <StatCard label="Avg Position" value={(gsc.totals.position || 0).toFixed(1)} />
      </div>
      <p className="text-xs text-body uppercase tracking-wide mb-1">Top Search Queries</p>
      {gsc.topQueries.length === 0 && <p className="text-xs text-body">No data yet</p>}
      <div className="space-y-0.5">
        {gsc.topQueries.map((q) => (
          <div key={q.query} className="flex justify-between text-sm py-0.5">
            <span className="text-dark truncate pr-2">{q.query}</span>
            <span className="text-body whitespace-nowrap">
              {num(q.clicks)} clicks &middot; {num(q.impressions)} impr &middot; #{(q.position || 0).toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-dark">Analytics</h1>
        {data && <span className="text-xs text-body">Updated {new Date(data.generatedAt).toLocaleString()}</span>}
      </div>

<div>
  <h2 className="text-xl font-bold text-dark mb-1">Live Activity</h2>
  <p className="text-sm text-body mb-3">Two independent live trackers: first-party site tracking (updates every 5s) and Google Analytics (may lag a minute or two).</p>
  <p className="text-xs font-semibold text-body uppercase tracking-wide mb-1">Site Tracking (First-Party)</p>
  <RealtimeSection />
  <p className="text-xs font-semibold text-body uppercase tracking-wide mt-4 mb-1">Google Analytics</p>
  <LiveVisitorCount /></div>

      {loading && <p className="text-body">Loading analytics...</p>}

      {data && (
        <>
          <h2 className="text-xl font-bold text-dark mb-1">Business Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Total Revenue" value={money(data.totals.totalRevenue)} />
            <StatCard label="Collected" value={money(data.totals.totalCollected)} />
            <StatCard label="Orders" value={String(data.totals.totalOrders)} />
            <StatCard label="Avg Order Value" value={money(data.totals.averageOrderValue)} />
            <Link
              href="/admin/customers"
              className="block rounded-lg transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <StatCard label="Customers" value={String(data.totals.totalCustomers)} />
            </Link>
            <StatCard label="Catalog Items" value={String(data.totals.totalItems)} />
          </div>

          <div className="admin-card p-4">
            <h2 className="admin-card-header">Revenue &amp; Orders (Last 12 Months)</h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#2d6a2d" strokeWidth={2} name="Revenue" />
                <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#4CAF50" strokeWidth={2} name="Orders" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <RankTable title="Top Items by Units Rented" rows={data.rankedByUnits} valueLabel="Units" valueFn={(r) => String(r.units)} />
            <RankTable title="Top Items by Revenue" rows={data.rankedByRevenue} valueLabel="Revenue" valueFn={(r) => money(r.revenue)} />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <GeoTable title="Where Bookings Come From (Top Cities)" rows={data.topCities} />
            <GeoTable title="Bookings by State" rows={data.topStates} />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="admin-card p-4">
              <h2 className="admin-card-header">Delivery vs. Pickup</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.deliveryMix}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4CAF50" name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="admin-card p-4">
              <h2 className="admin-card-header">Top Customers by Revenue</h2>
              <table className="w-full text-sm">
                <tbody>
                  {data.topCustomers.map((c, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1 font-bold text-secondary w-8">{i + 1}</td>
                      <td className="py-1">{c.name}</td>
                      <td className="py-1 text-right text-body">{c.orders} orders</td>
                      <td className="py-1 text-right font-medium">{money(c.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-dark mb-1">Website Traffic &amp; SEO</h2>
            <p className="text-sm text-body mb-3">
              Visitor counts, page views, visitor locations, traffic sources and search keyword rankings are tracked by Google (Measurement ID {data.google.measurementId}). Connect the Google APIs to surface those numbers here, or open them directly in Google.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <GoogleAnalyticsSection fallbackUrl={data.google.analyticsUrl} />
              <SearchConsoleSection fallbackUrl={data.google.searchConsoleUrl} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
