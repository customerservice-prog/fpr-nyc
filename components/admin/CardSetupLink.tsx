'use client'

import { useState } from 'react'

export default function CardSetupLink({ orderId }: { orderId: string }) {
  const [url, setUrl] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function prepare(replace = false) {
    if (busy) return
    if (replace && !window.confirm('Create a new authorization link? The previous link will stop working. This does not remove an already saved card.')) return
    setBusy(true)
    setMessage('')
    try {
      let link = url
      if (!link || replace || (expiresAt && Date.parse(expiresAt) <= Date.now())) {
        const response = await fetch(`/api/admin/orders/${orderId}/card-setup-link`, { method: 'POST' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Could not create the authorization link.')
        link = new URL(data.path, window.location.origin).href
        setUrl(link)
        setExpiresAt(data.expiresAt)
      }
      try {
        await navigator.clipboard.writeText(link)
        setMessage('Copied. Send this private NYC authorization link only to the customer.')
      } catch {
        setMessage('Select and copy the link below to send it to the customer.')
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create the link.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-4 rounded-lg border border-gray-200 p-3 no-print">
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={busy} className="text-sm font-semibold text-secondary disabled:opacity-50" onClick={() => void prepare()}>
          {busy ? 'Preparing link…' : url ? 'Copy authorization link' : 'Create card authorization link'}
        </button>
        {url && <button type="button" disabled={busy} onClick={() => void prepare(true)} className="text-sm underline disabled:opacity-50">Replace authorization link</button>}
      </div>
      <p className="mt-1 text-xs text-body">
        The customer can securely save or replace their payment method for this NYC order. No payment is taken during setup. New damage, missing-item, cleaning, late, or other documented charges require this recorded authorization.
      </p>
      {url && <input aria-label="Customer card authorization link" readOnly value={url} onFocus={e => e.target.select()} className="mt-2 w-full rounded border px-2 py-1 text-xs" />}
      {expiresAt && <p className="mt-2 text-xs text-gray-600">Link expires {new Date(expiresAt).toLocaleString()}. Creating another link invalidates the earlier link.</p>}
      {message && <p role="status" className="mt-2 text-xs">{message}</p>}
    </div>
  )
}
