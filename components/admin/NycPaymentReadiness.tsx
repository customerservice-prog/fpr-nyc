'use client'

import { useEffect, useState } from 'react'

type Readiness = {
  onlinePaymentsAvailable: boolean
  onlineCheckoutAvailable: boolean
  mode: string | null
  checks: Record<string, boolean>
}

const checks: Array<[string, string]> = [
  ['stripeKeysConfigured', 'Stripe publishable and secret keys'],
  ['nycAccountIdConfigured', 'Separate NYC Stripe account configured'],
  ['webhookSecretConfigured', 'Stripe payment webhook signing secret'],
  ['onlinePaymentsSwitchOn', 'Owner payment activation switch'],
  ['nycAccountVerified', 'NYC Stripe account identity verified'],
  ['stripeAccountActivated', 'NYC account capable of taking charges'],
  ['taxRateConfigured', 'NYC delivery ZIP tax jurisdictions configured'],
  ['depositRuleConfigured', 'Approved NYC deposit rule stored'],
  ['checkoutPolicyConfigured', 'NYC checkout policy configured'],
  ['deliveryFeesConfigured', 'At least one approved delivery ZIP has a fee'],
]

export default function NycPaymentReadiness() {
  const [data, setData] = useState<Readiness | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/payments/status', { cache: 'no-store' })
      const value = await res.json()
      if (!res.ok || typeof value?.onlineCheckoutAvailable !== 'boolean' || !value?.checks) throw new Error('Unable to read payment readiness.')
      setData(value as Readiness)
    } catch {
      setData(null)
      setError('Could not verify payment readiness. Do not assume online checkout is available.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  return <section className="rounded-xl border bg-white p-5 space-y-4">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-bold text-dark">NYC payment readiness</h2>
        <p className="text-sm text-gray-600">Live read-only validation. This check never creates an order or charges a card.</p>
      </div>
      <button type="button" onClick={() => void refresh()} disabled={loading} className="rounded border px-3 py-2 text-sm font-semibold disabled:opacity-50">{loading ? 'Checking…' : 'Recheck'}</button>
    </div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {data && <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border p-3">
          <p className="text-sm text-gray-600">Existing NYC order pay links</p>
          <p className={data.onlinePaymentsAvailable ? 'font-bold text-green-700' : 'font-bold text-amber-700'}>{data.onlinePaymentsAvailable ? 'Configuration checks passed' : 'Not ready / needs attention'}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-sm text-gray-600">New NYC online checkout</p>
          <p className={data.onlineCheckoutAvailable ? 'font-bold text-green-700' : 'font-bold text-amber-700'}>{data.onlineCheckoutAvailable ? 'Configuration checks passed' : 'Not ready / needs attention'}</p>
        </div>
      </div>
      <p className="text-sm text-gray-600">Stripe mode: {data.mode || 'unverified'}. Passing configuration checks does not substitute for a controlled end-to-end checkout and receipt test.</p>
      <ul className="divide-y rounded-lg border">
        {checks.map(([key, label]) => <li key={key} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
          <span>{label}</span>
          <span className={data.checks[key] ? 'shrink-0 font-semibold text-green-700' : 'shrink-0 font-semibold text-amber-700'}>{data.checks[key] ? 'Passed' : 'Needs attention'}</span>
        </li>)}
      </ul>
    </div>}
  </section>
}
