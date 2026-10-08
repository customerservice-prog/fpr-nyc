'use client'

import { use, useEffect, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { getStripe } from '@/lib/stripe-client'

function SetupForm({ onComplete }: { onComplete: (id: string) => Promise<void> }) {
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  return (
    <form className="space-y-5" onSubmit={async event => {
      event.preventDefault()
      if (!stripe || !elements || busy) return
      setBusy(true)
      setError('')
      try {
        const result = await stripe.confirmSetup({ elements, redirect: 'if_required' })
        if (result.error) throw new Error(result.error.message || 'Could not save your payment method.')
        if (!result.setupIntent || result.setupIntent.status !== 'succeeded') {
          throw new Error('Your bank has not completed authorization yet. Please contact us if this continues.')
        }
        await onComplete(result.setupIntent.id)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save your payment method.')
        setBusy(false)
      }
    }}>
      <PaymentElement />
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <button disabled={!stripe || busy} className="btn-primary w-full disabled:opacity-50">
        {busy ? 'Saving securely…' : 'Authorize and save payment method'}
      </button>
    </form>
  )
}

export default function SaveCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [token, setToken] = useState('')
  const [info, setInfo] = useState<{ orderNumber: string; authorization: string; version: string } | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [secret, setSecret] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function request(body: Record<string, unknown>, linkToken = token) {
    const response = await fetch(`/api/orders/${id}/card-setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, token: linkToken }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Could not load authorization.')
    return data
  }

  useEffect(() => {
    const linkToken = new URLSearchParams(window.location.search).get('token') || sessionStorage.getItem('nyc-card-setup-' + id) || ''
    if (linkToken) sessionStorage.setItem('nyc-card-setup-' + id, linkToken)
    setToken(linkToken)
    // Remove the bearer token from future referrers and visible browser history.
    window.history.replaceState(null, '', window.location.pathname)
    request({ action: 'info' }, linkToken).then(setInfo).catch(err => setError(err.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return (
    <main className="mx-auto max-w-xl px-5 py-12 space-y-6">
      <h1 className="text-2xl font-bold text-dark">Secure payment method authorization</h1>
      {done ? (
        <div role="status" className="rounded-xl bg-green-50 p-6 text-green-900">
          Your payment method is saved for NYC order #{info?.orderNumber}. No payment was taken today.
        </div>
      ) : (
        <>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{error}</p>}
          {!info && !error && <p>Loading your authorization…</p>}
          {info && (
            <>
              <p>Order #{info.orderNumber}</p>
              <p className="text-sm leading-6">{info.authorization}</p>
              <a className="text-secondary underline" href={`/contract/${id}`} target="_blank" rel="noreferrer">Read your rental agreement</a>
              {!secret ? (
                <div className="space-y-5">
                  <label className="flex items-start gap-3">
                    <input type="checkbox" className="mt-1" checked={accepted} onChange={event => setAccepted(event.target.checked)} />
                    <span>I have read and agree to this authorization.</span>
                  </label>
                  <button
                    disabled={!accepted || busy}
                    className="btn-primary w-full disabled:opacity-50"
                    onClick={async () => {
                      setBusy(true)
                      setError('')
                      try {
                        const data = await request({ action: 'create', consent: true, version: info.version })
                        setSecret(data.clientSecret)
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Could not start setup.')
                      } finally {
                        setBusy(false)
                      }
                    }}
                  >
                    {busy ? 'Opening secure form…' : 'Continue to secure payment form'}
                  </button>
                </div>
              ) : (
                <Elements stripe={getStripe()} options={{ clientSecret: secret }}>
                  <SetupForm onComplete={async setupIntentId => {
                    await request({ action: 'confirm', setupIntentId })
                    sessionStorage.removeItem('nyc-card-setup-' + id)
                    setDone(true)
                  }} />
                </Elements>
              )}
              <p className="text-xs text-gray-500">
                Your payment details go directly to Stripe. Friendly Party Rental NYC does not store your full card number or security code.
              </p>
            </>
          )}
        </>
      )}
    </main>
  )
}
