'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import { csvCell } from '@/lib/marketing/reporting'

type Summary = {
  emailsSent: number
  uniqueRecipients: number
  campaignsSent: number
  bookingsAttributed: number
  bookedRevenue: number
  collectedRevenue: number
  convertedRecipients: number
  conversionRate: number
  failedSends: number
  suppressedSends: number
  duplicateBlocked: number
  simulatedSends: number
  emailsOpened: number
  emailsClicked: number
  totalOpenEvents: number
  totalClickEvents: number
  openRate: number
  clickRate: number
  engagementTrackingAvailable: boolean
}

type Campaign = {
  slug: string
  name: string
  sends: number
  uniqueRecipients: number
  opens: number
  clicks: number
  totalOpenEvents: number
  totalClickEvents: number
  openRate: number
  clickRate: number
  bookings: number
  bookedRevenue: number
  collectedRevenue: number
  convertedRecipients: number
  conversionRate: number
  lastSentAt: string | null
}

type Run = {
  id: string
  campaignName: string
  subject: string
  status: string
  mode: string
  segment?: string | null
  createdAt: string
  sentCount: number
  failedCount: number
  suppressedCount: number
  duplicateBlockedCount: number
  simulatedCount: number
  initiatedByName?: string | null
  errorMessage?: string | null
}

type Attribution = {
  orderId: string
  orderNumber: string
  orderCreatedAt: string
  campaignName: string
  sentAt: string
  bookedRevenue: number
  collectedRevenue: number
}

type PerformanceData = {
  delivery?: { available: boolean; mode?: string; approved?: boolean; ready?: boolean; dailyLimit?: number; usedToday?: number; remainingToday?: number; pauseReason?: string | null; asOf: string; checks?: { key: string; label: string; ok: boolean; detail: string }[] }
  range: { days: number; start: string; end: string; attributionWindowDays: number }
  summary: Summary
  trend: { date: string; sent: number; opened: number; clicked: number }[]
  campaigns: Campaign[]
  recentRuns: Run[]
  recentAttributions: Attribution[]
  methodology: string
}

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const integer = new Intl.NumberFormat('en-US')

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-2xl font-bold text-dark">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      {sub && <div className="mt-1 text-xs text-gray-400">{sub}</div>}
    </div>
  )
}

function StatusPill({ value }: { value: string }) {
  const normalized = value.toLowerCase()
  const cls = normalized === 'completed' || normalized === 'sent'
    ? 'bg-green-50 text-green-700 border-green-200'
    : normalized === 'failed' || normalized === 'error'
      ? 'bg-red-50 text-red-700 border-red-200'
      : normalized === 'running' || normalized === 'queued'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : 'bg-gray-50 text-gray-600 border-gray-200'
  return <span className={'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ' + cls}>{value}</span>
}

export default function PerformancePage() {
  const [days, setDays] = useState(30)
  const [campaignSearch, setCampaignSearch] = useState('')
  const [data, setData] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setData(null)
    setError('')
    fetch('/api/admin/marketing-performance?days=' + days)
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Could not load performance')
        if (!cancelled) setData(json)
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load performance') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [days, refresh])

  const maxCampaignRevenue = useMemo(() => Math.max(...(data?.campaigns || []).map((c) => c.bookedRevenue), 1), [data])

  function exportReport() {
    if (!data) return
    const rows = [['Reporting start', data.range.start], ['Reporting end / as of', data.range.end], ['Attribution method', data.methodology], [], ['Campaign','Emails sent','Recipients','Opened emails','Clicked emails','Bookings','Booked revenue','Collected revenue'], ...data.campaigns.map(c => [c.name,c.sends,c.uniqueRecipients,c.opens,c.clicks,c.bookings,c.bookedRevenue,c.collectedRevenue])]
    const blob = new Blob([rows.map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `marketing-${days}-days.csv`; a.click(); URL.revokeObjectURL(url)
  }
  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-dark">Marketing Performance</h2>
          <p className="mt-1 max-w-3xl text-sm text-gray-500">Real sending, booking and revenue results from Friendly Party Rental NYC marketing activity.</p>
        </div>
        <div className="flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
          {[7, 30, 90, 365].map((n) => (
            <button key={n} onClick={() => setDays(n)} className={'rounded-md px-3 py-1.5 text-xs font-semibold ' + (days === n ? 'bg-dark text-white' : 'text-gray-600 hover:bg-gray-50')}>
              {n === 365 ? '1 Year' : `${n} Days`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3"><Link href="/admin/marketing/history" className="rounded border bg-white px-4 py-2 text-sm">Search send history →</Link><button onClick={exportReport} disabled={!data || loading} className="rounded border bg-white px-4 py-2 text-sm disabled:opacity-40">Export campaign report CSV</button><button onClick={() => setRefresh(v => v + 1)} className="rounded border bg-white px-4 py-2 text-sm">Refresh results</button></div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}<button onClick={() => setRefresh((v) => v + 1)} className="ml-3 font-semibold underline">Retry</button></div>}
      {loading && <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Loading real marketing results…</div>}

      {!loading && data && (
        <>
          <section className="rounded-xl border border-blue-200 bg-blue-50 p-5" aria-label="Marketing sending status">
            <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-bold text-slate-950">{!data.delivery?.available ? 'Sending status unavailable' : data.delivery.mode === 'review' ? 'Review mode — automatic sending is off' : data.delivery.mode === 'paused' ? 'Automatic sending is paused' : data.delivery.approved && data.delivery.ready ? 'Automatic sending is approved — schedule and limits apply' : 'Automatic sending is blocked pending readiness or approval'}</h3><p className="mt-2 text-sm text-slate-700">Viewing this report never activates campaigns or sends emails.</p></div><Link href="/admin/marketing" className="self-start rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-semibold">Review marketing setup →</Link></div>
            {data.delivery?.available && <><p className="mt-3 text-sm">Today: {data.delivery.usedToday} of {data.delivery.dailyLimit} daily slots used; {data.delivery.remainingToday} remaining. America/New_York. Attempts reserved for sending count toward the cap, including uncertain outcomes.</p>{data.delivery.pauseReason && <p className="mt-2 text-sm">{data.delivery.pauseReason}</p>}<details className="mt-3"><summary className="cursor-pointer text-sm font-semibold">Connection and scheduler checks</summary><div className="mt-3 grid gap-3 md:grid-cols-2">{data.delivery.checks?.map(check => <div key={check.key} className="rounded-lg bg-white p-3 text-sm"><strong>{check.ok ? 'Ready: ' : 'Needs attention: '}{check.label}</strong><p className="mt-1 text-slate-600">{check.detail}</p></div>)}</div></details></>}
            <p className="mt-3 text-xs text-slate-600">Report dates: {new Date(data.range.start).toLocaleString()} through {new Date(data.range.end).toLocaleString()}. The current period is still in progress; use Refresh results for a new snapshot.</p>
          </section>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard label="Bookings Attributed" value={integer.format(data.summary.bookingsAttributed)} sub={`${data.range.attributionWindowDays}-day last-touch window`} />
            <MetricCard label="Booked Revenue" value={money.format(data.summary.bookedRevenue)} sub="Order value attributed to email" />
            <MetricCard label="Collected Revenue" value={money.format(data.summary.collectedRevenue)} sub="Payments collected on those orders" />
            <MetricCard label="Conversion Rate" value={`${data.summary.conversionRate.toFixed(2)}%`} sub="Recipients who booked ÷ unique recipients" />
            <MetricCard label="Emails Sent" value={integer.format(data.summary.emailsSent)} sub="Successful sends recorded" />
            <MetricCard label="Unique Recipients" value={integer.format(data.summary.uniqueRecipients)} />
            <MetricCard label="Campaigns Sent" value={integer.format(data.summary.campaignsSent)} />
            <MetricCard label="Open Rate" value={`${data.summary.openRate.toFixed(2)}%`} sub={`${integer.format(data.summary.emailsOpened)} sent emails recorded an open`} />
            <MetricCard label="Click Rate" value={`${data.summary.clickRate.toFixed(2)}%`} sub={`${integer.format(data.summary.emailsClicked)} sent emails recorded a click`} />
            <MetricCard label="Failed Sends" value={integer.format(data.summary.failedSends)} sub={`${integer.format(data.summary.suppressedSends)} suppressed · ${integer.format(data.summary.duplicateBlocked)} duplicates blocked`} />
          </div>

          <section className="rounded-xl border bg-white p-5"><h3 className="font-semibold">Sending and engagement over time</h3><p className="mt-1 text-xs text-gray-500">UTC send dates. Opened and clicked counts are emails from each day's sends that have recorded engagement.</p><div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.trend}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date" minTickGap={35} tick={{fontSize:10}}/><YAxis allowDecimals={false}/><Tooltip/><Legend/><Line type="monotone" dataKey="sent" name="Sent" stroke="#1d4ed8" dot={false}/><Line type="monotone" dataKey="opened" name="Opened" stroke="#15803d" dot={false}/><Line type="monotone" dataKey="clicked" name="Clicked" stroke="#a21caf" dot={false}/></LineChart></ResponsiveContainer></div></section>
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-4">
                <h3 className="font-semibold text-dark">Campaign Results</h3>
                <p className="mt-1 text-xs text-gray-500">Sorted by attributed booked revenue.</p><input aria-label="Filter campaign results" placeholder="Find campaign…" value={campaignSearch} onChange={e => setCampaignSearch(e.target.value)} className="mt-3 w-full rounded border px-3 py-2 text-sm"/>
              </div>
              {data.campaigns.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">No successful marketing sends were recorded in this date range.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                      <tr><th className="px-4 py-3">Campaign</th><th className="px-3 py-3 text-right">Recipients</th><th className="px-3 py-3 text-right">Open</th><th className="px-3 py-3 text-right">Click</th><th className="px-3 py-3 text-right">Bookings</th><th className="px-3 py-3 text-right">Conversion</th><th className="px-3 py-3 text-right">Booked</th><th className="px-4 py-3 text-right">Collected</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.campaigns.filter(c => c.name.toLowerCase().includes(campaignSearch.toLowerCase())).map((c) => (
                        <tr key={c.slug || c.name} className="align-top">
                          <td className="px-4 py-3">
                            <div className="font-medium text-dark">{c.name}</div>
                            <div className="mt-1 h-1.5 max-w-[220px] overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-secondary" style={{ width: `${Math.max(3, (c.bookedRevenue / maxCampaignRevenue) * 100)}%` }} /></div>
                            <div className="mt-1 text-[11px] text-gray-400">Last sent {c.lastSentAt ? new Date(c.lastSentAt).toLocaleDateString() : '—'}</div>
                          </td>
                          <td className="px-3 py-3 text-right">{integer.format(c.uniqueRecipients)}</td>
                          <td className="px-3 py-3 text-right">{c.openRate.toFixed(2)}%</td>
                          <td className="px-3 py-3 text-right">{c.clickRate.toFixed(2)}%</td>
                          <td className="px-3 py-3 text-right font-semibold">{integer.format(c.bookings)}</td>
                          <td className="px-3 py-3 text-right">{c.conversionRate.toFixed(2)}%</td>
                          <td className="px-3 py-3 text-right font-semibold">{money.format(c.bookedRevenue)}</td>
                          <td className="px-4 py-3 text-right">{money.format(c.collectedRevenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-dark">Engagement Tracking</h3>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-50 p-3"><div className="text-xl font-bold text-dark">{data.summary.openRate.toFixed(2)}%</div><div className="text-xs text-gray-500">Open Rate</div><div className="mt-1 text-[11px] text-gray-400">{integer.format(data.summary.totalOpenEvents)} total open events</div></div>
                <div className="rounded-lg bg-gray-50 p-3"><div className="text-xl font-bold text-dark">{data.summary.clickRate.toFixed(2)}%</div><div className="text-xs text-gray-500">Click Rate</div><div className="mt-1 text-[11px] text-gray-400">{integer.format(data.summary.totalClickEvents)} total click events</div></div>
              </div>
              <p className="mt-4 text-xs leading-5 text-gray-500">Tracking is first-party and applies to marketing emails sent after this engagement release. Open rates are directional because image blocking, Gmail/Apple image proxies and privacy features can add or hide opens. Clicks can also be touched by email-security scanners. Bookings and collected revenue remain the strongest business outcome metrics.</p>
              <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">{data.methodology}</div>
            </section>
          </div>

          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4"><h3 className="font-semibold text-dark">Recently Attributed Bookings</h3></div>
            {data.recentAttributions.length === 0 ? <div className="p-6 text-sm text-gray-500">No attributed bookings in this range.</div> : (
              <div className="divide-y divide-gray-100">
                {data.recentAttributions.map((a) => (
                  <div key={a.orderId} className="grid gap-2 px-5 py-3 text-sm sm:grid-cols-[1fr_1.4fr_auto_auto] sm:items-center">
                    <a href={'/admin/orders/' + a.orderId} className="font-semibold text-secondary hover:underline">Order #{a.orderNumber}</a>
                    <div><div className="text-dark">{a.campaignName}</div><div className="text-xs text-gray-400">Email {new Date(a.sentAt).toLocaleDateString()} → booking {new Date(a.orderCreatedAt).toLocaleDateString()}</div></div>
                    <div className="text-right"><div className="font-semibold">{money.format(a.bookedRevenue)}</div><div className="text-[11px] text-gray-400">booked</div></div>
                    <div className="text-right"><div>{money.format(a.collectedRevenue)}</div><div className="text-[11px] text-gray-400">collected</div></div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4"><h3 className="font-semibold text-dark">Recent Campaign Runs</h3><p className="mt-1 text-xs text-gray-500">Operational audit trail for real, simulated, failed and suppressed sends.</p></div>
            {data.recentRuns.length === 0 ? <div className="p-6 text-sm text-gray-500">No campaign runs in this range.</div> : (
              <div className="divide-y divide-gray-100">
                {data.recentRuns.map((run) => (
                  <div key={run.id} className="px-5 py-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-medium text-dark">{run.campaignName}</div><div className="text-xs text-gray-400">{new Date(run.createdAt).toLocaleString()} · {run.segment || 'audience'} · {run.initiatedByName || 'system'}</div></div><StatusPill value={run.status} /></div>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500"><span><b className="text-dark">{run.sentCount}</b> sent</span><span><b className="text-dark">{run.failedCount}</b> failed</span><span><b className="text-dark">{run.suppressedCount}</b> suppressed</span><span><b className="text-dark">{run.duplicateBlockedCount}</b> duplicates blocked</span>{run.simulatedCount > 0 && <span><b className="text-dark">{run.simulatedCount}</b> simulated</span>}</div>
                    {run.errorMessage && <div className="mt-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700">{run.errorMessage}</div>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}


