'use client'

import { useState, type FormEvent } from 'react'
import { fetchDeliveryEstimate, type DeliveryEstimate } from '@/lib/deliveryEstimate'
import { formatCurrency } from '@/lib/utils'

export default function CartDeliveryFeeEstimator() {
  const [zip, setZip] = useState('')
  const [estimate, setEstimate] = useState<DeliveryEstimate | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = zip.trim()
    if (!/^\d{5}$/.test(normalized)) {
      setError('Enter a valid 5-digit ZIP code.')
      setEstimate(null)
      return
    }
    setLoading(true)
    setError('')
    try {
      setEstimate(await fetchDeliveryEstimate(normalized))
    } catch (err) {
      setEstimate(null)
      setError(err instanceof Error ? err.message : 'We could not check this ZIP code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
      <p className="text-sm font-bold text-dark">Check delivery fee before checkout</p>
      <p className="mt-1 text-xs text-slate-600">Enter the event ZIP for the same travel-fee estimate used by checkout.</p>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          value={zip}
          onChange={(event) => {
            setZip(event.target.value.replace(/\D/g, '').slice(0, 5))
            setError('')
          }}
          placeholder="ZIP code"
          aria-label="Event ZIP code"
          className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <button type="submit" disabled={loading} className="rounded bg-white px-3 py-2 text-sm font-bold text-primary shadow-sm ring-1 ring-primary/20 disabled:opacity-60">
          {loading ? 'Checking…' : 'Check fee'}
        </button>
      </form>
      {error ? <p className="mt-2 text-xs font-medium text-red-600" role="alert">{error}</p> : null}
      {estimate ? (
        <div className="mt-2 text-sm">
          <div className="flex items-center justify-between gap-3 font-bold text-dark">
            <span>Estimated travel fee</span>
            <span>{formatCurrency(estimate.fee)}</span>
          </div>
          <p className="mt-1 text-xs text-slate-600">Rentals, tax, optional timing, and setup services are separate.</p>
          {estimate.needsConfirmation ? (
            <p className="mt-1 text-xs font-medium text-amber-700">This ZIP is outside our usual delivery range. Please call us to confirm delivery before booking.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

