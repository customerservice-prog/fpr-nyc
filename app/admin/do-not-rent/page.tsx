'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

interface Identifier {
    id: string
    type: string
    displayValue: string
    addressScope?: string | null; customerLocation?: string | null
}

interface Restriction {
    id: string
    status: string
    reasonCategory: string
    internalNotes?: string | null
    sourceOrderNumber?: string | null
    sourceCustomerId?: string | null
    createdByName?: string | null
    createdAt: string
    identifiers: Identifier[]
}

const REASON_CATEGORIES = [
    'Payment Issue',
    'Chargeback',
    'Equipment Damage',
    'Equipment Not Returned',
    'Unsafe Property / Site',
    'Abusive / Threatening Conduct',
    'Fraud Concern',
    'Repeated Policy Violations',
    'Unauthorized Use',
    'Other',
  ]

function subjectLabel(r: Restriction) {
    const custId = r.identifiers.find((i) => i.type === 'CUSTOMER_ID')
    if (custId) return custId.displayValue
    const email = r.identifiers.find((i) => i.type === 'EMAIL')
    const phone = r.identifiers.find((i) => i.type === 'PHONE')
    if (email || phone) return (email?.displayValue || phone?.displayValue) as string
    const address = r.identifiers.find((i) => i.type === 'ADDRESS')
    if (address) return address.displayValue + ' (Address Only)'
    return 'Restriction'
}

function identifierSummary(r: Restriction) {
    const counts: Record<string, number> = {}
        r.identifiers.forEach((i) => { counts[i.type] = (counts[i.type] || 0) + 1 })
    const parts: string[] = []
        if (counts.CUSTOMER_ID) parts.push('Customer')
    if (counts.EMAIL) parts.push(counts.EMAIL + (counts.EMAIL === 1 ? ' email' : ' emails'))
    if (counts.PHONE) parts.push(counts.PHONE + (counts.PHONE === 1 ? ' phone' : ' phones'))
    if (counts.ADDRESS) parts.push(counts.ADDRESS + (counts.ADDRESS === 1 ? ' address' : ' addresses'))
    return parts.join(' \u00b7 ')
}

function locationLabel(r: Restriction) {
        const custId = r.identifiers.find((i) => i.type === 'CUSTOMER_ID')
                if (custId && custId.customerLocation) return custId.customerLocation
                        const address = r.identifiers.find((i) => i.type === 'ADDRESS')
                                if (address) return address.displayValue
                                        return null
}

export default function DoNotRentPage() {
    const [restrictions, setRestrictions] = useState<Restriction[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('ACTIVE')
    const [activeCount, setActiveCount] = useState(0)
    const [restrictedAddressCount, setRestrictedAddressCount] = useState(0)
    const [recentBlockedAttempts, setRecentBlockedAttempts] = useState(0)
    const [legacyUnmigratedCount, setLegacyUnmigratedCount] = useState(0)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [addOpen, setAddOpen] = useState(false)
    const [saving, setSaving] = useState(false)

  const [reasonCategory, setReasonCategory] = useState(REASON_CATEGORIES[0])
    const [internalNotes, setInternalNotes] = useState('')
    const [custName, setCustName] = useState('')
    const [custId, setCustId] = useState('')
    const [includeCustomer, setIncludeCustomer] = useState(false)
    const [email, setEmail] = useState('')
    const [includeEmail, setIncludeEmail] = useState(false)
    const [phone, setPhone] = useState('')
    const [includePhone, setIncludePhone] = useState(false)
    const [street1, setStreet1] = useState('')
    const [unit, setUnit] = useState('')
    const [city, setCity] = useState('')
    const [state, setState] = useState('NY')
    const [zip, setZip] = useState('')
    const [addressScope, setAddressScope] = useState('EXACT_UNIT')
    const [includeAddress, setIncludeAddress] = useState(false)

  const [custSearch, setCustSearch] = useState('')
    const [custResults, setCustResults] = useState<any[]>([])

  const load = () => {
        setLoading(true)
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        if (statusFilter) params.set('status', statusFilter)
        fetch('/api/admin/rental-restrictions?' + params.toString())
          .then((r) => r.json())
          .then((d) => {
                    setRestrictions(d.restrictions || [])
                    setActiveCount(d.activeCount || 0)
                    setRestrictedAddressCount(d.restrictedAddressCount || 0)
                    setRecentBlockedAttempts(d.recentBlockedAttempts || 0)
                    setLegacyUnmigratedCount(d.legacyUnmigratedCount || 0)
          })
          .finally(() => setLoading(false))
  }

  useEffect(() => {
        const t = setTimeout(load, 200)
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter])

  useEffect(() => {
        if (!custSearch.trim()) { setCustResults([]); return }
        const t = setTimeout(() => {
                fetch('/api/admin/customers?search=' + encodeURIComponent(custSearch) + '&pageSize=8')
                  .then((r) => r.json())
                  .then((d) => setCustResults(d.customers || []))
                  .catch(() => {})
        }, 250)
        return () => clearTimeout(t)
  }, [custSearch])
    useEffect(() => {
        if (typeof window === 'undefined') return
        const qp = new URLSearchParams(window.location.search)
        const qCustomerId = qp.get('customerId')
        const qName = qp.get('name')
        const qEmail = qp.get('email')
        const qPhone = qp.get('phone')
        if (qCustomerId || qEmail || qPhone) {
            setAddOpen(true)
            if (qCustomerId) { setCustId(qCustomerId); setCustName(qName || ''); setIncludeCustomer(true) }
            if (qEmail) { setEmail(qEmail); setIncludeEmail(true) }
            if (qPhone) { setPhone(qPhone); setIncludePhone(true) }
        }
    }, [])
    

  const pickCustomer = (c: any) => {
        setCustId(c.id)
        setCustName(c.firstName + ' ' + c.lastName)
        setIncludeCustomer(true)
        if (c.email) { setEmail(c.email); setIncludeEmail(true) }
        if (c.phone) { setPhone(c.phone); setIncludePhone(true) }
        setCustResults([])
        setCustSearch('')
  }

  const resetForm = () => {
        setReasonCategory(REASON_CATEGORIES[0]); setInternalNotes('')
        setCustName(''); setCustId(''); setIncludeCustomer(false)
        setEmail(''); setIncludeEmail(false)
        setPhone(''); setIncludePhone(false)
        setStreet1(''); setUnit(''); setCity(''); setState('NY'); setZip('')
        setAddressScope('EXACT_UNIT'); setIncludeAddress(false)
        setCustSearch(''); setCustResults([])
  }

  const submitRestriction = async () => {
        const identifiers: any[] = []
              if (includeCustomer && custId) identifiers.push({ type: 'CUSTOMER_ID', value: custName || 'Customer', customerId: custId })
        if (includeEmail && email) identifiers.push({ type: 'EMAIL', value: email })
        if (includePhone && phone) identifiers.push({ type: 'PHONE', value: phone })
        if (includeAddress && street1) {
                identifiers.push({
                          type: 'ADDRESS',
                          value: street1 + (unit ? ' Unit ' + unit : '') + ', ' + city + ', ' + state + ' ' + zip,
                          addressScope,
                          address: { street1, unit, city, state, zip },
                })
        }
        if (identifiers.length === 0) {
                alert('Select at least one identifier to restrict (customer, email, phone, or address)')
                return
        }
        if (!internalNotes.trim() && reasonCategory === 'Other') {
                if (!window.confirm('No internal notes were entered for this restriction. Continue anyway?')) return
        }
        setSaving(true)
        try {
                const res = await fetch('/api/admin/rental-restrictions', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ reasonCategory, internalNotes, identifiers }),
                })
                const data = await res.json()
                if (!res.ok) { alert(data.error || 'Failed to create restriction'); return }
                resetForm()
                setAddOpen(false)
                load()
        } finally {
                setSaving(false)
        }
  }

  const deactivate = async (id: string) => {
        const reason = window.prompt('Reason for removing this active restriction (e.g. "Issue resolved", "Added accidentally"):')
        if (!reason || !reason.trim()) return
        const res = await fetch('/api/admin/rental-restrictions/' + id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'deactivate', reason: reason.trim() }),
        })
        if (res.ok) load()
        else alert('Failed to deactivate restriction')
  }

  const migrateLegacy = async () => {
        if (!window.confirm('Convert ' + legacyUnmigratedCount + ' legacy Do Not Rent customer flag(s) into proper Rental Restriction cases? This does not change who is restricted.')) return
        const res = await fetch('/api/admin/rental-restrictions/migrate-legacy', { method: 'POST' })
        const data = await res.json()
        if (res.ok) { alert('Migrated ' + data.migratedCount + ' legacy record(s)'); load() }
        else alert(data.error || 'Migration failed')
  }

  return (
        <div className="p-4 max-w-6xl mx-auto">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                      <div>
                                <h1 className="text-2xl font-bold text-dark">Do Not Rent</h1>
                                <p className="text-sm text-body">Rental restrictions for customers, contacts and locations.</p>
                      </div>
                      <button onClick={() => setAddOpen((v) => !v)} type="button" className="btn-admin">{addOpen ? 'Cancel' : '+ Add Restriction'}</button>
              </div>

{addOpen && (
                <div className="admin-card mb-6 space-y-4">
                    <h2 className="font-semibold text-dark">New Rental Restriction</h2>
                    <div>
                        <label className="block text-sm font-medium text-dark mb-1">Search existing customer (optional)</label>
                        <input type="search" placeholder="Search by name, email, or phone..." value={custSearch} onChange={(e) => setCustSearch(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm w-full max-w-md" />
                        {custResults.length > 0 && (
                            <div className="border border-gray-200 rounded mt-1 max-w-md divide-y">
                                {custResults.map((c) => (
                                    <button key={c.id} type="button" onClick={() => pickCustomer(c)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">{c.firstName} {c.lastName} - {c.email || c.phone}</button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <label className="flex items-start gap-2 text-sm">
                            <input type="checkbox" checked={includeCustomer} onChange={(e) => setIncludeCustomer(e.target.checked)} disabled={!custId} className="mt-1" />
                            <span>Restrict customer profile{custName ? (' - ' + custName) : ''}</span>
                        </label>
                        <label className="flex items-start gap-2 text-sm">
                            <input type="checkbox" checked={includeEmail} onChange={(e) => setIncludeEmail(e.target.checked)} className="mt-1" />
                            <span className="flex-1">Restrict email
                                <input type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm w-full mt-1" />
                            </span>
                        </label>
                        <label className="flex items-start gap-2 text-sm">
                            <input type="checkbox" checked={includePhone} onChange={(e) => setIncludePhone(e.target.checked)} className="mt-1" />
                            <span className="flex-1">Restrict phone
                                <input type="tel" placeholder="(315) 555-1212" value={phone} onChange={(e) => setPhone(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm w-full mt-1" />
                            </span>
                        </label>
                        <label className="flex items-start gap-2 text-sm">
                            <input type="checkbox" checked={includeAddress} onChange={(e) => setIncludeAddress(e.target.checked)} className="mt-1" />
                            <span className="flex-1">Restrict address
                                <input type="text" placeholder="Street address" value={street1} onChange={(e) => setStreet1(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm w-full mt-1" />
                                <input type="text" placeholder="Unit (optional)" value={unit} onChange={(e) => setUnit(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm w-full mt-1" />
                                <input type="text" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm w-full mt-1" />
                                <input type="text" placeholder="ZIP" value={zip} onChange={(e) => setZip(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm w-full mt-1" />
                                {unit && (
                                    <select value={addressScope} onChange={(e) => setAddressScope(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm mt-1">
                                        <option value="EXACT_UNIT">This unit only</option>
                                        <option value="ENTIRE_PROPERTY">Entire property</option>
                                    </select>
                                )}
                            </span>
                        </label>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-dark mb-1">Reason category</label>
                        <select value={reasonCategory} onChange={(e) => setReasonCategory(e.target.value)} className="border border-gray-300 rounded px-2 py-2 text-sm">
                            {REASON_CATEGORIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-dark mb-1">Internal notes (staff only, never shown to customer)</label>
                        <textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={3} className="border border-gray-300 rounded px-3 py-2 text-sm w-full" placeholder="Details for staff reviewing this restriction..." />
                    </div>
                    <div className="flex gap-3">
                        <button onClick={submitRestriction} disabled={saving} type="button" className="btn-admin">{saving ? 'Saving...' : 'Create Restriction'}</button>
                        <button onClick={() => { setAddOpen(false); resetForm() }} type="button" className="text-body text-sm hover:underline">Cancel</button>
                    </div>
                </div>
            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                        <div className="admin-card">
                                  <p className="text-xs text-body uppercase tracking-wide">Active Restrictions</p>
                                  <p className="text-2xl font-bold text-dark">{activeCount}</p>
                        </div>
                        <div className="admin-card">
                                  <p className="text-xs text-body uppercase tracking-wide">Restricted Addresses</p>
                                  <p className="text-2xl font-bold text-dark">{restrictedAddressCount}</p>
                        </div>
                        <div className="admin-card">
                                  <p className="text-xs text-body uppercase tracking-wide">Blocked Attempts (30d)</p>
                                  <p className="text-2xl font-bold text-dark">{recentBlockedAttempts}</p>
                        </div>
                        <div className="admin-card">
                                  <p className="text-xs text-body uppercase tracking-wide">Legacy Flags</p>
                                  <p className="text-2xl font-bold text-dark">{legacyUnmigratedCount}</p>

                          {legacyUnmigratedCount > 0 && <button onClick={migrateLegacy} type="button" className="text-secondary text-xs font-medium hover:underline mt-1">Migrate now</button>}
                        </div>
        
        </div>

                  <div className="admin-card mb-4 flex flex-wrap gap-3 items-center">
                          <input type="search" placeholder="Search by name, email, phone, or address..." value={search} onChange={(e) => setSearch(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm flex-1 min-w-[240px]" />
                              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-300 rounded px-2 py-2 text-sm">
                                            <option value="ACTIVE">Active</option>
                                        <option value="INACTIVE">Inactive</option>
                                        <option value="">All</option>
                              </select>
                  </div>

            {!loading && restrictions.length === 0 && (
                    <div className="admin-card text-center py-12">
                              <p className="text-body mb-2">No active rental restrictions{search ? ' match your search' : ''}.</p>
                              <p className="text-sm text-body">Customers and addresses added to Do Not Rent will appear here.</p>
                    </div>
                    )}

                  <div className="space-y-3">
                      {restrictions.map((r) => (
                      <div key={r.id} className="admin-card !p-0 overflow-hidden">
                                  <button onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} type="button" className="w-full text-left px-4 py-3 flex flex-wrap items-center justify-between gap-2 hover:bg-gray-50">
                                                <span>
                                                                <span className="font-medium text-dark">{subjectLabel(r)}</span>
                                                    {locationLabel(r) && <span className="text-xs text-body ml-2">{locationLabel(r)}</span>}
                                                <span className="text-xs text-body ml-2">{identifierSummary(r)}</span>
                                                </span>
                                                <span className="flex items-center gap-3 text-sm text-body">
                                                                <span>{r.reasonCategory}</span>
                                                                <span>{formatDate(r.createdAt)}</span>
                                                                <span className={r.status === 'ACTIVE' ? 'badge bg-red-100 text-red-700' : 'badge bg-gray-100 text-gray-600'}>{r.status}</span>
                                                </span>
                                {r.status === 'ACTIVE' && (
                                    <button onClick={() => deactivate(r.id)} type="button" className="text-red-600 text-xs font-medium hover:underline mt-2">Deactivate restriction</button>
                                )}
                                  </button>
                  
            {expandedId === r.id && (
                          <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50 text-sm space-y-2">
                                          <p><span className="font-semibold text-dark">Identifiers: </span>{r.identifiers.map((i) => i.type + ': ' + i.displayValue).join(' | ')}</p>
                          <p><span className="font-semibold text-dark">Internal notes: </span>{r.internalNotes ? r.internalNotes : <span className="text-body italic">No notes added.</span>}</p>
                              {r.createdByName && <p className="text-xs text-body">Added by {r.createdByName} on {formatDate(r.createdAt)}</p>}
                          </div>
                                        )}
        </div>
                    ))}
                  </div>
        </div>
        )
}
                
