'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

type Status = 'unverified' | 'confirmed' | 'unavailable'
type Source = 'unknown' | 'nyc_stock' | 'partner_committed'
type Check = { status: Status; verifiedQuantity: number; source: Source; notes: string | null; verifiedAt: string | null; verifiedBy: string | null }
type Item = { id: string; slug: string; name: string; quantity: number; type: string; cost: number; category: { name: string }; verification: Check | null }
type Stats = { catalogItems: number; confirmed: number; unavailable: number; unverified: number }
type Draft = { status: Status; verifiedQuantity: number; source: Source; notes: string }

const baseDraft = (check: Check | null): Draft => ({
  status: check?.status || 'unverified',
  verifiedQuantity: check?.verifiedQuantity || 0,
  source: check?.source || 'unknown',
  notes: check?.notes || '',
})

export default function NycInventoryVerificationManager() {
  const [items, setItems] = useState<Item[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | Status>('all')
  const [page, setPage] = useState(0)
  const [working, setWorking] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/nyc-physical-inventory', { cache: 'no-store' })
      const payload = await res.json()
      if (!res.ok || !Array.isArray(payload.rows)) throw Error('Inventory verification is unavailable')
      const rows = payload.rows as Item[]
      setItems(rows)
      setStats(payload.stats)
      setDrafts(Object.fromEntries(rows.map(item => [item.slug, baseDraft(item.verification)])))
    } catch {
      setError('Could not load NYC physical stock verification. Do not assume equipment is physically available.')
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  function update(slug: string, patch: Partial<Draft>) {
    setNotice('')
    setDrafts(prev => ({
      ...prev,
      [slug]: {
        ...prev[slug],
        ...patch,
        ...('status' in patch && patch.status === 'unverified' ? { source: 'unknown', verifiedQuantity: 0 } : {}),
        ...('status' in patch && patch.status === 'unavailable' ? { verifiedQuantity: 0 } : {}),
      },
    }))
  }

  const visible = useMemo(() => items.filter(item => {
    const s = item.verification?.status || 'unverified'
    const query = search.trim().toLowerCase()
    return (filter === 'all' || s === filter) &&
      (!query || [item.name, item.slug, item.category.name].some(value => value.toLowerCase().includes(query)))
  }), [items, filter, search])
  const perPage = 25
  const shown = visible.slice(page * perPage, (page + 1) * perPage)
  const maxPage = Math.max(0, Math.ceil(visible.length / perPage) - 1)
  const currentPage = Math.min(page, maxPage)

  async function save(item: Item) {
    const form = drafts[item.slug]
    if (!form || working) return
    if (form.status === 'confirmed' && (form.verifiedQuantity < 1 || form.source === 'unknown')) {
      setError('To confirm stock, enter a positive quantity and select NYC-owned or supplier-committed inventory.')
      return
    }
    setError('')
    setNotice('')
    setWorking(item.slug)
    try {
      const res = await fetch('/api/admin/nyc-physical-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemSlug: item.slug, ...form }),
      })
      const data = await res.json()
      if (!res.ok || !data.verification) throw Error(data.error || 'Verification could not be saved')
      const next = items.map(row => row.slug === item.slug ? { ...row, verification: data.verification as Check } : row)
      setItems(next)
      setStats({
        catalogItems: next.length,
        confirmed: next.filter(row => row.verification?.status === 'confirmed').length,
        unavailable: next.filter(row => row.verification?.status === 'unavailable').length,
        unverified: next.filter(row => !row.verification || row.verification.status === 'unverified').length,
      })
      setNotice('Verification saved for ' + item.name + '. Public catalog availability and checkout were not changed.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save verification')
    } finally { setWorking(null) }
  }

  return <div className="space-y-5">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Physical stock verification counts">
      {[
        ['Public NYC catalog', stats?.catalogItems],
        ['Stock confirmed', stats?.confirmed],
        ['Unavailable', stats?.unavailable],
        ['Not verified', stats?.unverified],
      ].map(([label, count]) => <div key={label} className="rounded-xl border bg-white p-4">
        <div className="text-xs font-semibold text-gray-600">{label}</div>
        <div className="mt-2 text-2xl font-bold">{loading || count === undefined ? '—' : count}</div>
      </div>)}
    </div>
    <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <strong>Operational inventory only.</strong> Catalog quantities below are imported from Syracuse and do not prove NYC stock.
      Confirm equipment that is physically available to NYC or explicitly committed by a supplier for your bookings.
      These checks never change the public quantity, rental availability, or customer checkout.
      Packages can require multiple underlying items: confirm the package components separately.
    </p>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-wrap gap-2">
        <input aria-label="Search NYC equipment" className="rounded border px-3 py-2 text-sm" placeholder="Search item, category or slug" value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} />
        <select aria-label="Filter verification" className="rounded border px-3 py-2 text-sm" value={filter} onChange={e => { setFilter(e.target.value as typeof filter); setPage(0) }}>
          <option value="all">All NYC items</option>
          <option value="unverified">Unverified only</option>
          <option value="confirmed">Confirmed only</option>
          <option value="unavailable">Unavailable only</option>
        </select>
      </div>
      <button type="button" disabled={loading || Boolean(working)} onClick={() => void load()} className="rounded border px-3 py-2 text-sm font-semibold">Refresh NYC catalog</button>
    </div>
    {error && <p role="alert" className="rounded border border-red-300 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded border border-green-200 p-3 text-sm text-green-800">{notice}</p>}
    {loading ? <p>Loading NYC verification records…</p> :
      <div className="space-y-3">
        <p className="text-sm text-gray-600">{visible.length} matching NYC catalog items</p>
        {shown.map(item => {
          const form = drafts[item.slug] || baseDraft(item.verification)
          const original = baseDraft(item.verification)
          const dirty = JSON.stringify(form) !== JSON.stringify(original)
          return <section className="rounded-lg border bg-white p-4" key={item.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><p className="font-semibold text-gray-950">{item.name}</p><p className="text-xs text-gray-600">{item.category.name} · Listed catalog quantity: {item.quantity} · {item.type}</p></div>
              <Link href={'/admin/items/' + encodeURIComponent(item.id)} className="text-sm font-semibold text-blue-700 underline">View NYC catalog item</Link>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="text-xs font-semibold text-gray-700">Physical verification status
                <select className="mt-1 block w-full rounded border p-2 text-sm" value={form.status} onChange={e => update(item.slug, { status: e.target.value as Status })}>
                  <option value="unverified">Not verified</option>
                  <option value="confirmed">Confirmed for NYC</option>
                  <option value="unavailable">Not available for NYC</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-gray-700">Confirmed quantity
                <input type="number" min="0" max="100000" step="1" disabled={form.status !== 'confirmed'} className="mt-1 block w-full rounded border p-2 text-sm" value={form.verifiedQuantity} onChange={e => update(item.slug, { verifiedQuantity: Number(e.target.value) })}/>
              </label>
              <label className="text-xs font-semibold text-gray-700">Source of stock
                <select className="mt-1 block w-full rounded border p-2 text-sm" disabled={form.status === 'unverified'} value={form.source} onChange={e => update(item.slug, { source: e.target.value as Source })}>
                  <option value="unknown">Unknown</option>
                  <option value="nyc_stock">NYC-owned / physically staged</option>
                  <option value="partner_committed">Supplier committed / confirmed</option>
                </select>
              </label>
            </div>
            <label className="mt-3 block text-xs font-semibold text-gray-700">Verification notes (supplier, location, access, or limitations)
              <input className="mt-1 block w-full rounded border p-2 text-sm" maxLength={1000} value={form.notes} onChange={e => update(item.slug, { notes: e.target.value })} placeholder="Internal NYC staff notes; not shown to customers"/>
            </label>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-gray-500">{item.verification?.verifiedAt ? 'Last verified ' + new Date(item.verification.verifiedAt).toLocaleString() : 'No physical stock verification saved yet'}</p>
              <button type="button" disabled={!dirty || Boolean(working)} onClick={() => void save(item)} className="rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{working === item.slug ? 'Saving…' : dirty ? 'Save NYC verification' : 'No changes'}</button>
            </div>
          </section>
        })}
        {visible.length === 0 && <p className="rounded border bg-white p-4 text-sm">No matching NYC catalog items.</p>}
        <div className="flex items-center justify-between gap-4">
          <button type="button" className="rounded border px-4 py-2 text-sm disabled:opacity-30" disabled={currentPage === 0} onClick={() => setPage(Math.max(0, currentPage - 1))}>Previous</button>
          <span className="text-sm">Page {currentPage + 1} of {maxPage + 1}</span>
          <button type="button" className="rounded border px-4 py-2 text-sm disabled:opacity-30" disabled={currentPage >= maxPage} onClick={() => setPage(Math.min(maxPage, currentPage + 1))}>Next</button>
        </div>
      </div>}
  </div>
}
