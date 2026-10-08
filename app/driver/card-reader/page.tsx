'use client'

import { useEffect, useState } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { getStripe } from '@/lib/stripe-client'
import CardPaymentForm from '@/components/public/CardPaymentForm'

interface Stop {
  id: string
  orderNumber: string
  customerName: string
  totalAmount?: number
  amountPaid?: number
  balanceDue?: number
}

function formatCurrency(n: number) {
  return '$' + n.toFixed(2)
}

export default function DriverCardReaderPage() {
  const [stops, setStops] = useState<Stop[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Stop | null>(null)
  const [amount, setAmount] = useState('')
  const [creating, setCreating] = useState(false)
  const [clientSecret, setClientSecret] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/driver/orders')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setStops(d.stops || [])
      })
      .finally(() => setLoading(false))
  }, [])

  const selectStop = (s: Stop) => {
    setSelected(s)
    setAmount(String((s.balanceDue ?? 0).toFixed(2)))
    setClientSecret('')
    setDone(false)
    setError('')
  }

  const startCheckout = async () => {
    if (!selected) return
    const amt = Number(amount)
    if (!amt || amt <= 0) {
      setError('Enter a valid amount')
      return
    }
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/driver/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: selected.id, amount: amt }),
      })
      const data = await res.json()
      if (data.clientSecret) {
        setClientSecret(data.clientSecret)
      } else {
        setError(data.error || 'Could not start payment')
      }
    } catch (e) {
      setError('Could not start payment')
    }
    setCreating(false)
  }

  const confirmPayment = async (paymentIntentId: string) => {
    if (!selected) return
    try {
      const res = await fetch(`/api/orders/${selected.id}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount), stripePaymentId: paymentIntentId, sendReceipt: true }),
      })
      const data = await res.json()
      if (data.success || data.pending) {
        setDone(true)
      } else {
        setError(data.error || 'Could not confirm payment')
      }
    } catch (e) {
      setError('Could not confirm payment')
    }
  }

  const payable = stops.filter((s) => (s.balanceDue ?? 0) > 0)

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-xl font-bold mb-4">Card Reader</h1>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : !selected ? (
        <div className="bg-white rounded shadow divide-y">
          {payable.length === 0 && (
            <p className="p-4 text-sm text-gray-500">No stops with a balance due today.</p>
          )}
          {payable.map((s) => (
            <button
              key={s.id}
              onClick={() => selectStop(s)}
              className="w-full text-left p-4 flex justify-between items-center"
            >
              <div>
                <p className="font-medium text-sm">{s.orderNumber}</p>
                <p className="text-xs text-gray-500">{s.customerName}</p>
              </div>
              <span className="font-semibold text-green-700">{formatCurrency(s.balanceDue ?? 0)}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded shadow p-4">
          <button onClick={() => setSelected(null)} className="text-sm text-blue-600 underline mb-3">
            &larr; Back to list
          </button>
          <p className="font-medium mb-1">{selected.orderNumber} &middot; {selected.customerName}</p>
          <p className="text-sm text-gray-500 mb-4">Balance due: {formatCurrency(selected.balanceDue ?? 0)}</p>

          {done ? (
            <p className="text-green-700 font-semibold">Payment processed successfully.</p>
          ) : (
            <>
              <label className="block text-sm text-gray-600 mb-1">Amount to charge</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="border rounded px-3 py-2 w-full mb-3"
              />
              {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
              {!clientSecret && (
                <button
                  onClick={startCheckout}
                  disabled={creating}
                  className="w-full bg-green-700 text-white font-semibold py-3 rounded disabled:opacity-50"
                >
                  {creating ? 'Starting...' : 'Charge Card'}
                </button>
              )}
              {clientSecret && (
                <div className="mt-4">
                  <Elements stripe={getStripe()} options={{ clientSecret }}>
                    <CardPaymentForm amount={Number(amount)} onSuccess={(pid) => confirmPayment(pid)} />
                  </Elements>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
