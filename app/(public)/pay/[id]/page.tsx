'use client'

import { use, useEffect, useState } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getStripe } from '@/lib/stripe-client'
import CardPaymentForm from '@/components/public/CardPaymentForm'

interface PublicOrder {
  id: string
  orderNumber: string
  status: string
  eventDate: string
  eventEndDate?: string | null
  eventTimeSlot?: string | null
  eventAddress?: string
  eventCity?: string
  eventZip?: string
  deliveryType: string
  deliveryFee: number
  subtotal: number
  taxRate: number
  taxAmount: number
  totalAmount: number
  depositAmount: number
  amountPaid: number
  balanceDue: number
  customerName: string
  items: Array<{ itemName: string; quantity: number; unitPrice: number; total: number }>
}

export default function PayOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [order, setOrder] = useState<PublicOrder | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paid, setPaid] = useState(false)
  const [paymentOption, setPaymentOption] = useState<'deposit' | 'full' | 'other'>('deposit')
  const [otherAmount, setOtherAmount] = useState('')
  const [tipAmount, setTipAmount] = useState(0)
  const [customTip, setCustomTip] = useState('')

  useEffect(() => {
    fetch(`/api/orders/${id}/public`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setNotFound(true)
          return
        }
        setOrder(d.order)
      })
      .catch(() => setNotFound(true))
  }, [id])

  const hasDepositOption =
    !!order && order.amountPaid === 0 && order.depositAmount > 0 && order.depositAmount < order.balanceDue

  const otherAmountNum = Math.max(parseFloat(otherAmount) || 0, 0)
  const baseAmountDue = !order
    ? 0
    : paymentOption === 'other' && otherAmountNum > 0
    ? otherAmountNum
    : order.amountPaid > 0
    ? order.balanceDue
    : hasDepositOption
    ? (paymentOption === 'full' ? order.balanceDue : order.depositAmount)
    : order.balanceDue
  const amountDue = order ? Math.round((baseAmountDue + tipAmount) * 100) / 100 : 0
  const applyTipNone = () => { setCustomTip(''); setTipAmount(0) }
  const applyTip10 = () => { setCustomTip(''); setTipAmount(Math.round((order?.balanceDue || 0) * 0.1 * 100) / 100) }
  const applyTip15 = () => { setCustomTip(''); setTipAmount(Math.round((order?.balanceDue || 0) * 0.15 * 100) / 100) }
  const applyTip20 = () => { setCustomTip(''); setTipAmount(Math.round((order?.balanceDue || 0) * 0.2 * 100) / 100) }
  const handleCustomTip = (e: React.ChangeEvent<HTMLInputElement>) => { setCustomTip(e.target.value); setTipAmount(Math.max(0, parseFloat(e.target.value) || 0)) }

  const confirmPayment = async (stripePaymentId?: string) => {
    await fetch(`/api/orders/${id}/confirm-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amountDue, tipAmount, stripePaymentId }),
    })
    setPaid(true)
  }

  const handlePay = async () => {
    if (!order) return
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, amount: amountDue }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Payment failed')

      if (data.simulated) {
        await confirmPayment(data.paymentIntentId)
      } else {
        setClientSecret(data.clientSecret)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-dark mb-4">Quote Not Found</h1>
        <p className="text-body">This payment link is invalid or has expired. Please contact us at 315-884-1498.</p>
      </div>
    )
  }

  if (!order) {
    return <div className="max-w-2xl mx-auto px-4 py-12 text-center">Loading...</div>
  }

  if (paid || order.balanceDue <= 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-dark mb-4">Thank You!</h1>
        <p className="text-body">Your payment has been received for Order #{order.orderNumber}.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-dark mb-2">Quote #{order.orderNumber}</h1>
      <p className="text-body mb-8">Prepared for {order.customerName}</p>

      <div className="bg-gray-50 p-6 rounded-lg mb-8 space-y-3">
        <h2 className="font-bold text-dark mb-2">Event Details</h2>
        <p className="text-sm text-body">Date: {formatDate(order.eventDate)}</p>
        {order.eventEndDate && (
          <p className="text-sm text-body">Ends: {formatDate(order.eventEndDate)}</p>
        )}
        {order.eventTimeSlot && (
          <p className="text-sm text-body">Time: {order.eventTimeSlot}</p>
        )}
        {order.eventAddress && (
          <p className="text-sm text-body">{order.eventAddress}, {order.eventCity} NY {order.eventZip}</p>
        )}
        <p className="text-sm text-body">Delivery: {order.deliveryType}</p>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg mb-8">
        <h2 className="font-bold text-dark mb-3">Items</h2>
        {order.items.map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm py-1 border-b">
            <span>{item.itemName} x{item.quantity}</span>
            <span>{formatCurrency(item.total)}</span>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 p-6 rounded-lg mb-8 space-y-2">
        <h2 className="font-bold text-dark mb-2">Quote Summary</h2>
        <div className="flex justify-between text-sm text-body">
          <span>Subtotal</span>
          <span>{formatCurrency(order.subtotal)}</span>
        </div>
        {order.deliveryFee > 0 && (
          <div className="flex justify-between text-sm text-body">
            <span>Delivery Fee</span>
            <span>{formatCurrency(order.deliveryFee)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm text-body">
          <span>Tax ({order.taxRate}%)</span>
          <span>{formatCurrency(order.taxAmount)}</span>
        </div>
        <div className="flex justify-between font-bold text-dark border-t pt-2 mt-2">
          <span>Total</span>
          <span>{formatCurrency(order.totalAmount)}</span>
        </div>
        <div className="flex justify-between text-body text-sm">
          <span>Paid So Far</span>
          <span>{formatCurrency(order.amountPaid)}</span>
        </div>
      </div>

      {!!order && (
        <div className="bg-gray-50 p-6 rounded-lg mb-8">
          <h2 className="font-bold text-dark mb-3">Choose Payment Amount</h2>
          {hasDepositOption && (
            <>
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input
                  type="radio"
                  name="paymentOption"
                  checked={paymentOption === 'deposit'}
                  onChange={() => setPaymentOption('deposit')}
                />
                <span>Pay Deposit — {formatCurrency(order.depositAmount)}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="paymentOption"
                  checked={paymentOption === 'full'}
                  onChange={() => setPaymentOption('full')}
                />
                <span>Pay Full Amount — {formatCurrency(order.balanceDue)}</span>
              </label>
            </>
          )}

          <div className="mb-4">
            <label className="block text-sm text-body mb-1">Other Amount (if different from above)</label>
            <input type="number" min="0" step="0.01" value={otherAmount} onChange={(e) => { setOtherAmount(e.target.value); setPaymentOption('other') }} placeholder="Enter amount" className="border rounded px-3 py-2 w-full" />
            <div className="mt-4">
              <label className="block text-sm text-body mb-1">Add a Tip (optional)</label>
              <input type="number" min="0" step="0.01" value={customTip} onChange={handleCustomTip} placeholder="Tip amount" className="border rounded px-3 py-2 w-full" />
            </div>
          </div></div>
      )}
      <div className="bg-gray-50 p-6 rounded-lg mb-8 space-y-3">
        <div className="flex justify-between font-bold text-dark text-lg">
          <span>Amount Due Now</span>
          <span className="text-secondary">{formatCurrency(amountDue)}</span>
        </div>
        <div className="flex justify-between text-body text-sm">
          <span>Remaining Balance After This Payment</span>
          <span>{formatCurrency(Math.max(order.balanceDue - baseAmountDue, 0))}</span>
        </div>
      </div>

      {!clientSecret && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-body">
            <p>Payment is processed securely through Stripe.</p>
          </div>
          <button
            onClick={handlePay}
            disabled={loading}
            className="btn-primary w-full text-lg py-3"
          >
            {loading ? 'Processing...' : `Pay ${formatCurrency(amountDue)}`}
          </button>
        </>
      )}

      {clientSecret && (
        <Elements stripe={getStripe()} options={{ clientSecret }}>
          <CardPaymentForm amount={amountDue} onSuccess={(pid) => confirmPayment(pid)} />
        </Elements>
      )}
    </div>
  )
}
