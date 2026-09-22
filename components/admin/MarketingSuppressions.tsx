'use client'

import { useEffect, useState } from 'react'

type Entry = { email: string; reason: string; updatedAt: string }
const reasonLabels: Record<string, string> = { bounce: 'Bounced email', complaint: 'Customer complaint', delivery_failure: 'Delivery failure', manual: 'Manual exclusion' }
const button = 'rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50'

export default function MarketingSuppressions() {
  const [email, setEmail] = useState(''), [reason, setReason] = useState('bounce'), [search, setSearch] = useState(''), [page, setPage] = useState(1)
  const [data, setData] = useState<{ entries: Entry[]; total: number; page: number; pageSize: number } | null>(null)
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), [refresh, setRefresh] = useState(0)
  const [removeEmail, setRemoveEmail] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    setData(null); setError('')
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/marketing-suppressions?${new URLSearchParams({ page: String(page), search })}`, { cache: 'no-store', signal: controller.signal }), json = await response.json()
        if (!response.ok) throw new Error(json.error || 'Could not load excluded emails.')
        if (!controller.signal.aborted) setData(json)
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not load excluded emails.') }
    }, 200)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [search, page, refresh])

  async function update(action: 'suppress' | 'remove', address: string) {
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch('/api/admin/marketing-suppressions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, email: address.trim(), reason }) }), json = await response.json()
      if (!response.ok) throw new Error(json.error || 'Could not update this email exclusion.')
      setNotice(action === 'suppress' ? 'Email excluded from future marketing sends.' : 'Delivery exclusion removed. Other unsubscribe and rental restrictions still apply.')
      setEmail(''); setRemoveEmail(null); setRefresh(value => value + 1)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update this email exclusion.') } finally { setBusy(false) }
  }

  return <section id="delivery-exclusions" className="rounded-xl border bg-white p-5"><h3 className="text-lg font-bold">Delivery exclusions</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">When an address bounces, a customer complains, or your email provider reports a delivery problem, add it here to stop future marketing. Customer unsubscribes and do-not-rent restrictions are managed separately and remain in force.</p><form className="mt-5 flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); void update('suppress', email) }}><label className="min-w-0 flex-1 text-sm font-semibold">Email address<input type="email" required autoComplete="off" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} disabled={busy} className="mt-2 block w-full min-w-48 rounded-lg border px-3 py-2" placeholder="customer@example.com"/></label><label className="text-sm font-semibold">Reason<select value={reason} disabled={busy} onChange={event => setReason(event.target.value)} className="mt-2 block rounded-lg border px-3 py-2">{Object.entries(reasonLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><button type="submit" disabled={busy} className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Exclude email'}</button></form>{error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}<button type="button" className="ml-3 underline" onClick={() => setRefresh(value => value + 1)}>Reload list</button></p>}{notice && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}<div className="mt-6 border-t pt-5"><label className="text-sm font-semibold">Find an excluded email<input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); setRemoveEmail(null) }} className="mt-2 block w-full rounded-lg border px-3 py-2 font-normal" placeholder="Search email addresses"/></label>{!data && !error ? <p role="status" className="mt-4 text-sm text-gray-500">Loading exclusions…</p> : data && <><p className="mt-3 text-xs text-gray-500">{data.total} matching exclusions</p><div className="mt-2 divide-y">{data.entries.map(entry => <div key={entry.email} className="py-3"><div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="break-all text-sm font-semibold">{entry.email}</p><p className="mt-1 text-xs text-gray-500">{reasonLabels[entry.reason] || entry.reason} · {new Date(entry.updatedAt).toLocaleDateString('en-US', { timeZone: 'America/New_York' })}</p></div><button type="button" disabled={busy} onClick={() => setRemoveEmail(entry.email)} className="text-xs text-gray-600 underline">Remove delivery exclusion</button></div>{removeEmail === entry.email && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3"><p className="text-sm text-amber-900">Remove this delivery exclusion for {entry.email}? Only do this after the delivery issue has been resolved and the customer can receive marketing again.</p><div className="mt-3 flex gap-3"><button type="button" className={button} disabled={busy} onClick={() => update('remove', entry.email)}>Confirm removal</button><button type="button" className={button} disabled={busy} onClick={() => setRemoveEmail(null)}>Keep excluded</button></div></div>}</div>)}</div>{data.entries.length === 0 && <p className="py-5 text-sm text-gray-500">No delivery exclusions match this search.</p>}<div className="mt-4 flex items-center gap-4"><button type="button" className={button} disabled={page <= 1 || busy} onClick={() => setPage(value => value - 1)}>Previous</button><span className="text-xs">Page {data.page} of {Math.max(1, Math.ceil(data.total / data.pageSize))}</span><button type="button" className={button} disabled={page * data.pageSize >= data.total || busy} onClick={() => setPage(value => value + 1)}>Next</button></div></>}</div></section>
}
