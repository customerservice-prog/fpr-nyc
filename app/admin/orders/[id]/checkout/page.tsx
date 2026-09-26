'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Elements } from '@stripe/react-stripe-js'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'
import { getStripe } from '@/lib/stripe-client'
import CardPaymentForm from '@/components/public/CardPaymentForm'

interface OrderItem {
  id: string
  itemName: string
  quantity: number
  unitPrice: number
  total: number
}

interface PaymentRecord {
  id: string
  amount: number
  method: string
  createdAt: string
  notes?: string | null
}

interface AdminOrder {
  id: string
  orderNumber: string
  status: string
  eventDate: string
  createdAt: string
  deliveryDistance?: number | null
  subtotal: number
  deliveryFee: number
  taxAmount: number
  taxRate: number
  depositAmount: number
  tipAmount: number
  totalAmount: number
  amountPaid: number
  balanceDue: number
  items: OrderItem[]
  payments: PaymentRecord[]
  customer: { id: string; firstName: string; lastName: string; email: string; phone?: string }
}

const TIP_OPTIONS = [10, 15, 20]

export default function AdminCheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [order, setOrder] = useState<AdminOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentType, setPaymentType] = useState('')
  const [tipPercent, setTipPercent] = useState(0)
  const [customAmount, setCustomAmount] = useState('')
  const [sendReceipt, setSendReceipt] = useState(true)
  const [pendingAmount, setPendingAmount] = useState(0)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [sendingQuote, setSendingQuote] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/orders/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.order) setOrder(data.order)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) return <div className="p-8">Loading...</div>
  if (!order) return <div className="p-8">Order not found</div>

  const daysAdvance = (new Date(order.eventDate).getTime() - new Date(order.createdAt).getTime()) / 86400000
  const showAdvanceWarning = daysAdvance < 2
  const MAX_SERVICE_DISTANCE_MILES = 100
  const showServiceRangeWarning = !!order.deliveryDistance && order.deliveryDistance > MAX_SERVICE_DISTANCE_MILES

  const remainingBalance = Math.max(order.totalAmount - order.amountPaid, 0)
  const depositRemaining = order.amountPaid === 0 && order.depositAmount > 0 ? order.depositAmount : 0
  const tipAmountCalc = tipPercent > 0 ? Math.round(order.totalAmount * tipPercent) / 100 : 0
  const chargeFor = (base: number) => Math.max(Math.round((base + tipAmountCalc) * 100) / 100, 0)

  const startCardCheckout = async (base: number) => {
    const amt = chargeFor(base)
    if (!amt || amt <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    setCreating(true)
    setPendingAmount(amt)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id, amount: amt, tipAmount: tipAmountCalc }),
      })
      const data = await res.json()
      if (data.simulated) {
        toast.success('Payment simulated (Stripe not configured)')
        setDone(true)
      } else if (data.clientSecret) {
        setClientSecret(data.clientSecret)
      } else {
        toast.error(data.error || 'Could not start checkout')
      }
    } catch (e) {
      toast.error('Could not start checkout')
    }
    setCreating(false)
  }

  const confirmCardPayment = async (stripePaymentId: string) => {
    try {
      const res = await fetch(`/api/orders/${id}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: pendingAmount,
          tipAmount: tipAmountCalc,
          stripePaymentId,
          sendReceipt,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Payment processed successfully')
        setDone(true)
      } else {
        toast.error(data.error || 'Could not confirm payment')
      }
    } catch (e) {
      toast.error('Could not confirm payment')
    }
  }

  const payManual = async (base: number) => {
    const amt = chargeFor(base)
    if (!amt || amt <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/orders/${id}/manual-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          tipAmount: tipAmountCalc,
          method: paymentType,
          sendReceipt,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Payment recorded successfully')
        setDone(true)
      } else {
        toast.error(data.error || 'Could not record payment')
      }
    } catch (e) {
      toast.error('Could not record payment')
    }
    setSubmitting(false)
  }

  const handlePay = (base: number) => {
    if (paymentType === 'card') {
      startCardCheckout(base)
    } else {
      payManual(base)
    }
  }

  const submitWithoutPayment = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/orders/${id}/submit-without-payment`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Order submitted without payment')
        router.push(`/admin/orders/${id}`)
      } else {
        toast.error(data.error || 'Could not submit order')
      }
    } catch (e) {
      toast.error('Could not submit order')
    }
    setSubmitting(false)
  }

  const sendQuote = async () => {
    setSendingQuote(true)
    try {
      const res = await fetch(`/api/admin/orders/${id}/send-quote`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Quote sent to customer')
      } else {
        toast.error(data.error || 'Could not send quote')
      }
    } catch (e) {
      toast.error('Could not send quote')
    }
    setSendingQuote(false)
  }

  const custom = Number(customAmount)

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.push(`/admin/orders/${id}`)} className="text-sm text-blue-600">
          Back to Order
        </button>
        <button onClick={() => router.push(`/admin/customers/${order.customer.id}`)} className="text-sm text-blue-600">
          Edit Billing Info
        </button>
      </div>
      <h1 className="text-2xl font-bold mb-2">Payment Options</h1>
      <p className="mb-4 text-gray-600">
        Order {order.orderNumber} - {order.customer.firstName} {order.customer.lastName}
      </p>

      {showAdvanceWarning && (
        <div className="border border-yellow-400 bg-yellow-50 text-yellow-800 rounded p-3 mb-4 text-sm">
          Warning: We require a minimum advance for booking of 2 days.
        </div>
      )}
      {showServiceRangeWarning && (
        <div className="border border-yellow-400 bg-yellow-50 text-yellow-800 rounded p-3 mb-4 text-sm">
          The event location appears to be outside our service range ({order.deliveryDistance?.toFixed(1)} miles). Are you sure you wish to place this order?
        </div>
      )}

      <div className="border rounded p-4 mb-6 bg-gray-50">
        <h2 className="font-semibold mb-2">Order Summary</h2>
        <ul className="mb-3 text-sm divide-y">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between py-1">
              <span>{item.itemName} x {item.quantity}</span>
              <span>{formatCurrency(item.total)}</span>
            </li>
          ))}
        </ul>
        <div className="text-sm space-y-1">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
          {order.deliveryFee > 0 && (
            <div className="flex justify-between"><span>Travel Fee</span><span>{formatCurrency(order.deliveryFee)}</span></div>
          )}
          <div className="flex justify-between"><span>Tax ({order.taxRate}%)</span><span>{formatCurrency(order.taxAmount)}</span></div>
          <div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span>{formatCurrency(order.totalAmount)}</span></div>
          <div className="flex justify-between"><span>Amount Paid</span><span>{formatCurrency(order.amountPaid)}</span></div>
          <div className="flex justify-between font-bold"><span>Balance Due</span><span>{formatCurrency(remainingBalance)}</span></div>
          {depositRemaining > 0 && (
            <div className="flex justify-between text-amber-700"><span>Deposit Required</span><span>{formatCurrency(depositRemaining)}</span></div>
          )}
        </div>
      </div>

      {order.payments.length > 0 && (
        <div className="border rounded p-4 mb-6">
          <h2 className="font-semibold mb-2">Payment History</h2>
          <ul className="text-sm divide-y">
            {order.payments.map((p) => (
              <li key={p.id} className="flex justify-between py-1">
                <span>{new Date(p.createdAt).toLocaleDateString()} - {p.method}</span>
                <span>{formatCurrency(p.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {done ? (
        <div className="border rounded p-4 bg-green-50 text-green-800">
          Payment recorded successfully.{' '}
          <button onClick={() => router.push(`/admin/orders/${id}`)} className="underline">
            Return to order
          </button>
        </div>
      ) : (
        <>
          <label className="block mb-1 text-sm font-medium">Payment Type</label>
          <select
            value={paymentType}
            onChange={(e) => {
              setPaymentType(e.target.value)
              setClientSecret(null)
            }}
            className="border rounded px-3 py-2 w-full mb-1"
          >
            <option value="">---- Select Payment Type ----</option>
            <option value="card">Credit Card (Visa / Mastercard / Amex)</option>
            <option value="check">Check</option>
            <option value="gift_card">Gift Card</option>
            <option value="cash">Cash</option>
            <option value="none">Submit without Payment</option>
          </select>
          {paymentType === 'card' && (
            <p className="text-xs text-red-600 mb-4">DISCOVER NOT ACCEPTED - No Discover</p>
          )}

          {paymentType === 'none' && (
            <button
              onClick={submitWithoutPayment}
              disabled={submitting}
              className="bg-blue-600 text-white px-4 py-2 rounded w-full mt-4"
            >
              {submitting ? 'Submitting...' : 'Submit without Payment'}
            </button>
          )}

          {paymentType && paymentType !== 'none' && !clientSecret && (
            <>
              <label className="block mb-1 text-sm font-medium mt-4">Add Tip</label>
              <div className="flex gap-2 mb-4">
                {TIP_OPTIONS.map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setTipPercent(pct)}
                    className={`px-3 py-1 rounded border ${tipPercent === pct ? 'bg-blue-600 text-white' : 'bg-white'}`}
                  >
                    {pct}%
                  </button>
                ))}
                <button
                  onClick={() => setTipPercent(0)}
                  className={`px-3 py-1 rounded border ${tipPercent === 0 ? 'bg-blue-600 text-white' : 'bg-white'}`}
                >
                  Clear
                </button>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handlePay(remainingBalance)}
                  disabled={creating || submitting || remainingBalance <= 0}
                  className="bg-green-600 text-white px-4 py-2 rounded w-full"
                >
                  Pay All ({formatCurrency(chargeFor(remainingBalance))})
                </button>

                {depositRemaining > 0 && (
                  <button
                    onClick={() => handlePay(depositRemaining)}
                    disabled={creating || submitting}
                    className="bg-green-600 text-white px-4 py-2 rounded w-full"
                  >
                    Pay Deposit Due ({formatCurrency(chargeFor(depositRemaining))})
                  </button>
                )}

                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Custom Amount"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="border rounded px-3 py-2 flex-1"
                  />
                  <button
                    onClick={() => handlePay(custom)}
                    disabled={creating || submitting || !custom || custom <= 0}
                    className="bg-green-600 text-white px-4 py-2 rounded"
                  >
                    Pay Custom Amount
                  </button>
                </div>
              </div>
            </>
          )}

          {clientSecret && (
            <div className="mt-4">
              <Elements stripe={getStripe()} options={{ clientSecret }}>
                <CardPaymentForm amount={pendingAmount} onSuccess={(pid) => confirmCardPayment(pid)} />
              </Elements>
            </div>
          )}

          {paymentType && paymentType !== 'none' && (
            <label className="flex items-center gap-2 mt-6 text-sm">
              <input
                type="checkbox"
                checked={!sendReceipt}
                onChange={(e) => setSendReceipt(!e.target.checked)}
              />
              Do not Send Receipt
            </label>
          )}

          <button
            onClick={sendQuote}
            disabled={sendingQuote}
            className="mt-6 text-sm text-blue-600 underline"
          >
            {sendingQuote ? 'Sending...' : 'Send a Quote'}
          </button>
        </>
      )}
    </div>
  )
}
