'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Raincheck {
  id: string
  amount: number
  reason?: string
  issuedAt: string
  expiresAt?: string
  redeemedAt?: string
  redeemedOrderId?: string
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [customer, setCustomer] = useState<{
    firstName: string
    lastName: string
    email: string
    phone?: string
    address?: string
    city?: string
    zip?: string          
    state?: string
          company?: string
          secondaryPhone?: string
          secondaryEmail?: string
          customerType?: string
          notes?: string
          creditStatus?: string

    orders: Array<{
      id: string
      orderNumber: string
      eventDate: string
      status: string
      totalAmount: number
      balanceDue: number
    }>
    rainchecks: Raincheck[]
  } | null>(null)
  const [issueAmount, setIssueAmount] = useState('')
  const [issueReason, setIssueReason] = useState('')
  const [issueExpires, setIssueExpires] = useState('')
  const [issuing, setIssuing] = useState(false)
  const [applyOrderChoice, setApplyOrderChoice] = useState<Record<string, string>>({})
  const [applyingId, setApplyingId] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [editing, setEditing] = useState(false)
    const [form, setForm] = useState<any>({})
    const [saving, setSaving] = useState(false)
  const loadCustomer = () => {
    fetch(`/api/admin/customers/${id}`)
      .then((r) => r.json())
      .then((d) => { setCustomer(d.customer); setForm(d.customer || {}) })
  }

  useEffect(() => {
    loadCustomer()
  }, [id])

  if (!customer) return <div className="p-4">Loading...</div>

  const issueRaincheck = async () => {
    if (!issueAmount || Number(issueAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }
    setIssuing(true)
    try {
      const res = await fetch('/api/admin/rainchecks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: id,
          amount: Number(issueAmount),
          reason: issueReason || undefined,
          expiresAt: issueExpires || undefined,
        }),
      })
      const data = await res.json()
      if (data.error) {
        alert(data.error)
      } else {
        setIssueAmount('')
        setIssueReason('')
        setIssueExpires('')
        loadCustomer()
      }
    } finally {
      setIssuing(false)
    }
  }

  const voidRaincheck = async (id: string) => {
    if (!confirm('Void this raincheck? This cannot be undone.')) return
    const res = await fetch(`/api/admin/rainchecks/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.error) {
      alert(data.error)
    } else {
      loadCustomer()
    }
  }

  const applyRaincheck = async (id: string) => {
    const orderId = applyOrderChoice[id]
    if (!orderId) {
      alert('Please select an order to apply this credit to')
      return
    }
    setApplyingId(id)
    try {
      const res = await fetch(`/api/admin/rainchecks/${id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      const data = await res.json()
      if (data.error) {
        alert(data.error)
      } else {
        alert(`Applied ${formatCurrency(data.creditAmount)} credit to the order.`)
        loadCustomer()
      }
    } finally {
      setApplyingId(null)
    }
  }

  const openOrders = customer.orders.filter((o) => o.balanceDue > 0)

  const deleteCustomer = async () => {
    if (!confirm('Delete this customer permanently? This cannot be undone.')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/customers/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) {
        alert(data.error)
      } else {
        window.location.href = '/admin/customers'
      }
    } finally {
      setDeleting(false)
    }
  }

    const saveCustomer = async () => {
          setSaving(true)
          try {
                  const res = await fetch(`/api/admin/customers/${id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(form),
                  })
                  const data = await res.json()
                  if (data.error) {
                            alert(data.error)
                  } else {
                            setEditing(false)
                            loadCustomer()
                  }
          } finally {
                  setSaving(false)
          }
    }

  return (
    <div className="p-4 max-w-4xl">
      <Link href="/admin/customers" className="text-secondary hover:underline text-sm">&larr; Back to Customers</Link>
      <h1 className="text-2xl font-bold mt-2 mb-1">{customer.firstName} {customer.lastName}</h1>
        {customer.orders.length === 0 && (
          <button
            onClick={deleteCustomer}
            disabled={deleting}
            className="border border-red-600 text-red-600 rounded px-3 py-1 text-sm mb-2"
          >
            {deleting ? 'Deleting...' : 'Delete Customer'}
          </button>
        )}
<Link href="/admin/orders/new" className="btn-admin inline-block text-sm mb-3">Book an Order</Link>
      {!editing && (
        <div className="mb-4">
          <p className="text-body mb-1">{customer.email}</p>
          {customer.phone && <p className="text-body mb-1">{customer.phone}</p>}
          {customer.company && <p className="text-body mb-1">{customer.company}</p>}
          {customer.address && <p className="text-body mb-1">{customer.address}{customer.city ? `, ${customer.city}` : ''} {customer.state || ''} {customer.zip || ''}</p>}
          {customer.secondaryPhone && <p className="text-body mb-1">Alt phone: {customer.secondaryPhone}</p>}
          {customer.secondaryEmail && <p className="text-body mb-1">Alt email: {customer.secondaryEmail}</p>}
          <span className="inline-block text-xs px-2 py-1 rounded bg-gray-200 mt-1">{customer.customerType || 'Customer'}</span>
          <span className={`inline-block text-xs px-2 py-1 rounded mt-1 ml-2 font-medium ${customer.creditStatus === 'hold' ? 'bg-red-100 text-red-700' : customer.creditStatus === 'watch' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{customer.creditStatus === 'hold' ? 'Credit Hold' : customer.creditStatus === 'watch' ? 'Watch' : 'Good Standing'}</span>
          {customer.notes && (
            <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
              <div className="font-medium mb-1">Notes</div>
              <div className="whitespace-pre-wrap">{customer.notes}</div>
            </div>
          )}
          <div className="mt-3">
            <button onClick={() => setEditing(true)} className="text-secondary hover:underline text-sm">Edit Contact Info</button>
          </div>
        </div>
      )}
      {editing && (
        <div className="bg-white rounded shadow p-4 mb-4">
          <h3 className="font-medium mb-3">Edit Customer</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm text-body mb-1">First Name</label>
              <input className="border rounded px-2 py-1 w-full" value={form.firstName || ''} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-body mb-1">Last Name</label>
              <input className="border rounded px-2 py-1 w-full" value={form.lastName || ''} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-body mb-1">Email</label>
              <input className="border rounded px-2 py-1 w-full" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-body mb-1">Phone</label>
              <input className="border rounded px-2 py-1 w-full" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-body mb-1">Company</label>
              <input className="border rounded px-2 py-1 w-full" value={form.company || ''} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-body mb-1">Customer Type</label>
              <select className="border rounded px-2 py-1 w-full" value={form.customerType || 'Customer'} onChange={(e) => setForm({ ...form, customerType: e.target.value })}>
                <option value="Prospect">Prospect</option>
                <option value="Customer">Customer</option>
                <option value="Tax Exempt">Tax Exempt</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-body mb-1">Secondary Phone</label>
              <input className="border rounded px-2 py-1 w-full" value={form.secondaryPhone || ''} onChange={(e) => setForm({ ...form, secondaryPhone: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-body mb-1">Secondary Email</label>
              <input className="border rounded px-2 py-1 w-full" value={form.secondaryEmail || ''} onChange={(e) => setForm({ ...form, secondaryEmail: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-body mb-1">Address</label>
              <input className="border rounded px-2 py-1 w-full" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-body mb-1">City</label>
              <input className="border rounded px-2 py-1 w-full" value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-body mb-1">State</label>
              <input className="border rounded px-2 py-1 w-full" value={form.state || ''} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-body mb-1">Zip</label>
              <input className="border rounded px-2 py-1 w-full" value={form.zip || ''} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
            </div>
          </div>
          <div className="mt-2">
            <label className="block text-sm text-body mb-1">Notes</label>
            <textarea className="border rounded px-2 py-1 w-full" rows={3} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })}></textarea>
          </div>
          <div className="mt-2">
            <label className="block text-sm text-body mb-1">Credit Status</label>
            <select className="border rounded px-2 py-1" value={form.creditStatus || 'good'} onChange={(e) => setForm({ ...form, creditStatus: e.target.value })}>
              <option value="good">Good Standing</option>
              <option value="watch">Watch</option>
              <option value="hold">Credit Hold</option>
            </select>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={saveCustomer} disabled={saving} className="bg-secondary text-white px-4 py-2 rounded disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
            <button onClick={() => setEditing(false)} className="border px-4 py-2 rounded">Cancel</button>
          </div>
        </div>
      )}      

      <h2 className="text-lg font-semibold mt-6 mb-4">Orders</h2>
      <div className="bg-white rounded shadow">
        {customer.orders.map((o) =>  {
          const statusBadgeClass = o.status === 'active' ? 'badge badge-active' : o.status === 'quote' ? 'badge badge-quote' : o.status === 'canceled' ? 'badge badge-canceled' : o.status === 'completed' ? 'badge badge-completed' : 'badge badge-incomplete'
                    const statusLabel = o.status.charAt(0).toUpperCase() + o.status.slice(1)
                              return (
          <div key={o.id} className="flex justify-between items-center border-b px-4 py-3">
            <div>
              <Link href={`/admin/orders/${o.id}`} className="text-secondary hover:underline font-medium">
                {o.orderNumber}
              </Link>
                          <span className={statusBadgeClass + ' ml-2'}>{statusLabel}</span>
              <span className="text-sm text-body ml-2">{formatDate(o.eventDate)}</span>
            </div>
            <span className="font-medium">{formatCurrency(o.totalAmount)}</span>
          </div>
        )
})}
      </div>

      <h2 className="text-lg font-semibold mt-8 mb-4">Rainchecks</h2>
      <div className="bg-white rounded shadow mb-4">
        {customer.rainchecks.length === 0 && (
          <div className="px-4 py-3 text-sm text-body">No rainchecks issued to this customer yet.</div>
        )}
        {customer.rainchecks.map((rc) => {
          const isExpired = rc.expiresAt ? new Date(rc.expiresAt) < new Date() : false
          const statusLabel = rc.redeemedAt ? 'Redeemed' : isExpired ? 'Expired' : 'Active'
          return (
            <div key={rc.id} className="border-b px-4 py-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium">{formatCurrency(rc.amount)}</span>
                  {rc.reason && <span className="text-sm text-body ml-2">{rc.reason}</span>}
                  <span className="text-sm text-body ml-2">Issued {formatDate(rc.issuedAt)}</span>
                  {rc.expiresAt && <span className="text-sm text-body ml-2">Expires {formatDate(rc.expiresAt)}</span>}
                </div>
                <span className={
                  statusLabel === 'Active' ? 'text-green-600 text-sm font-medium' :
                  statusLabel === 'Redeemed' ? 'text-body text-sm font-medium' :
                  'text-red-600 text-sm font-medium'
                }>{statusLabel}</span>
              </div>
              {statusLabel === 'Active' && (
                <div className="flex items-center gap-2 mt-2">
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={applyOrderChoice[rc.id] || ''}
                    onChange={(e) => setApplyOrderChoice({ ...applyOrderChoice, [rc.id]: e.target.value })}
                  >
                    <option value="">Apply to order...</option>
                    {openOrders.map((o) => (
                      <option key={o.id} value={o.id}>{o.orderNumber} (balance {formatCurrency(o.balanceDue)})</option>
                    ))}
                  </select>
                  <button
                    onClick={() => applyRaincheck(rc.id)}
                    disabled={applyingId === rc.id}
                    className="bg-secondary text-white text-sm px-3 py-1 rounded disabled:opacity-50"
                  >
                    {applyingId === rc.id ? 'Applying...' : 'Apply'}
                  </button>
                  <button
                    onClick={() => voidRaincheck(rc.id)}
                    className="text-red-600 text-sm px-3 py-1 rounded border border-red-600"
                  >
                    Void
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded shadow p-4">
        <h3 className="font-medium mb-3">Issue a New Raincheck</h3>
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-sm text-body mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              value={issueAmount}
              onChange={(e) => setIssueAmount(e.target.value)}
              className="border rounded px-2 py-1 w-28"
            />
          </div>
          <div>
            <label className="block text-sm text-body mb-1">Reason</label>
            <input
              type="text"
              value={issueReason}
              onChange={(e) => setIssueReason(e.target.value)}
              className="border rounded px-2 py-1 w-56"
              placeholder="e.g. Weather cancellation"
            />
          </div>
          <div>
            <label className="block text-sm text-body mb-1">Expires (optional)</label>
            <input
              type="date"
              value={issueExpires}
              onChange={(e) => setIssueExpires(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
          <button
            onClick={issueRaincheck}
            disabled={issuing}
            className="bg-secondary text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {issuing ? 'Issuing...' : 'Issue Raincheck'}
          </button>
        </div>
      </div>
    </div>
  )
}
