'use client'

import { use, useEffect, useState } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import toast from 'react-hot-toast'
import { BUSINESS, formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { getStripe } from '@/lib/stripe-client'
import CardPaymentForm from '@/components/public/CardPaymentForm'
import PaymentCardAuthorization from '@/components/public/PaymentCardAuthorization'
import PaymentReceiptSummary from '@/components/public/PaymentReceiptSummary'
import type { PaymentReceipt } from '@/lib/paymentReceipt'

interface PublicOrder {
  id: string
  orderNumber: string
  status: string
  refundedAmount: number
  payments: Array<{ amount: number; createdAt: string }>
  eventDate: string
  eventEndDate?: string | null
  eventTimeSlot?: string | null
  eventAddress?: string
  eventCity?: string
  eventState?: string
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
  items: Array<{ itemId: string | null; itemName: string; quantity: number; unitPrice: number; total: number }>
}

export default function PayOrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ access?: string }> }) {
  const { id } = use(params)
  const { access: initialAccess } = use(searchParams)
  const [accessToken, setAccessToken] = useState(initialAccess || '')
  const [order, setOrder] = useState<PublicOrder | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paid, setPaid] = useState(false)
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null)
  const [saveCard, setSaveCard] = useState(false)
  const [paymentOption, setPaymentOption] = useState<'deposit' | 'full' | 'other'>('deposit')
  const [otherAmount, setOtherAmount] = useState('')
  const [tipAmount, setTipAmount] = useState(0)
  const [customTip, setCustomTip] = useState('')
  const [editItems, setEditItems] = useState<{ itemId: string; itemName: string; quantity: number; unitPrice: number }[]>([])
  const [editInitialized, setEditInitialized] = useState(false)
  const [addQuery, setAddQuery] = useState('')
  const [addResults, setAddResults] = useState<{ id: string; name: string; cost: number }[]>([])
  const [savingItems, setSavingItems] = useState(false)
  const [paymentsAvailable, setPaymentsAvailable] = useState<boolean | null>(null)
  const [verificationRequired, setVerificationRequired] = useState(false)
  const [verificationBusy, setVerificationBusy] = useState(false)
  const [challengeId, setChallengeId] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [verificationMessage, setVerificationMessage] = useState('')

  useEffect(() => {
    let active = true
    fetch('/api/payments/status', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => { if (active) setPaymentsAvailable(data?.onlinePaymentsAvailable === true) })
      .catch(() => { if (active) setPaymentsAvailable(false) })
    return () => { active = false }
  }, [])

  const loadOrder = async () => {
    const query = accessToken ? '?access=' + encodeURIComponent(accessToken) : ''
    try {
      const response = await fetch(`/api/orders/${id}/public${query}`, { cache: 'no-store' })
      const data = await response.json().catch(() => ({}))
      if (response.status === 401) {
        setVerificationRequired(true)
        setNotFound(false)
        setOrder(null)
        return
      }
      if (!response.ok || !data.order) {
        setNotFound(true)
        setVerificationRequired(false)
        return
      }
      setVerificationRequired(false)
      setNotFound(false)
      setOrder(data.order)
    } catch {
      setNotFound(true)
    }
  }

  useEffect(() => {
    void loadOrder()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, accessToken])

  useEffect(() => {
    if (order && !editInitialized) {
      setEditItems(
        order.items.map((i) => ({
          itemId: i.itemId || '',
          itemName: i.itemName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        }))
      )
      setEditInitialized(true)
    }
  }, [order, editInitialized])

  const canSelfEdit = !!order && (order.status === 'quote' || order.status === 'incomplete') && order.items.every((i) => !!i.itemId)

  const changeQty = (idx: number, delta: number) => {
    setEditItems((prev) => prev.map((it, i) => (i === idx ? { ...it, quantity: Math.max(1, it.quantity + delta) } : it)))
  }

  const removeEditItem = (idx: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== idx))
  }

  const searchCatalog = async (q: string) => {
    setAddQuery(q)
    if (!order || q.trim().length < 2) {
      setAddResults([])
      return
    }
    try {
      const res = await fetch(`/api/items?date=${encodeURIComponent(order.eventDate)}&search=${encodeURIComponent(q)}`)
      const data = await res.json()
      setAddResults((data.items || []).slice(0, 8))
    } catch {
      setAddResults([])
    }
  }

  const addCatalogItem = (item: { id: string; name: string; cost: number }) => {
    setEditItems((prev) => {
      const existingIdx = prev.findIndex((p) => p.itemId === item.id)
      if (existingIdx >= 0) {
        return prev.map((p, i) => (i === existingIdx ? { ...p, quantity: p.quantity + 1 } : p))
      }
      return [...prev, { itemId: item.id, itemName: item.name, quantity: 1, unitPrice: item.cost }]
    })
    setAddQuery('')
    setAddResults([])
  }

  const saveItemChanges = async () => {
    if (!order) return
    setSavingItems(true)
    try {
      const res = await fetch(`/api/orders/${order.id}/items${accessToken ? '?access=' + encodeURIComponent(accessToken) : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: editItems.map((i) => ({ itemId: i.itemId, quantity: i.quantity })) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save changes')
      const refreshed = await fetch(`/api/orders/${order.id}/public${accessToken ? '?access=' + encodeURIComponent(accessToken) : ''}`, { cache: 'no-store' }).then((r) => r.json())
      if (refreshed.order) setOrder(refreshed.order)
      setEditInitialized(false)
      toast.success('Your quote has been updated.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save changes')
    } finally {
      setSavingItems(false)
    }
  }

  const hasDepositOption =
    !!order && order.amountPaid === 0 && order.depositAmount > 0 && order.depositAmount < order.balanceDue

  // Fully paid before this visit - the page used to dead-end here with no way to
  // add a tip. Now we still let the customer add a tip for the crew.
  const alreadyFullyPaid = !!order && order.amountPaid > 0 && order.balanceDue <= 0
  const tipBasis = order ? (order.balanceDue > 0 ? order.balanceDue : order.totalAmount) : 0

  const otherAmountNum = Math.max(parseFloat(otherAmount) || 0, 0)
  const baseAmountDue = !order
    ? 0
    : alreadyFullyPaid
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
  const applyTip10 = () => { setCustomTip(''); setTipAmount(Math.round(tipBasis * 0.1 * 100) / 100) }
  const applyTip15 = () => { setCustomTip(''); setTipAmount(Math.round(tipBasis * 0.15 * 100) / 100) }
  const applyTip20 = () => { setCustomTip(''); setTipAmount(Math.round(tipBasis * 0.2 * 100) / 100) }
  const handleCustomTip = (e: React.ChangeEvent<HTMLInputElement>) => { setCustomTip(e.target.value); setTipAmount(Math.max(0, parseFloat(e.target.value) || 0)) }

  const confirmPayment = async (stripePaymentId: string) => {
    if (!stripePaymentId) throw new Error('Your payment result needs verification. Please contact us before paying again.')
    const response = await fetch(`/api/orders/${id}/confirm-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amountDue, tipAmount, stripePaymentId, saveCard, accessToken }),
    })
    if (!response.ok) throw new Error('Your payment result needs verification. Please contact us before paying again.')
    const result = await response.json()
    if (result.pending) {
      toast.success('Your payment is processing. We will email your receipt when it completes.')
    } else if (result.receipt?.orderId === id && result.receipt.status === 'succeeded') {
      setReceipt(result.receipt)
    }
    setPaid(true)
  }

  const handlePay = async () => {
    if (!order) return
    if (paymentsAvailable !== true) {
      toast.error('Online payment is temporarily unavailable. Please call us at ' + BUSINESS.phone + '.')
      return
    }
    if (amountDue <= 0) {
      toast.error('Please enter an amount greater than $0.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, amount: amountDue, tipAmount, saveCard, accessToken }),
      })
      const data = await res.json()
      if (!res.ok || !data.clientSecret) throw new Error(data.error || 'Payment failed')
      setClientSecret(data.clientSecret)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  const requestVerification = async () => {
    setVerificationBusy(true)
    setVerificationMessage('')
    try {
      const response = await fetch('/api/chat-assistant/order-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_by_id', orderId: id }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not send the verification code.')
      setChallengeId(data.challengeId || '')
      setVerificationMessage(data.message || 'Check the email already on the reservation for your verification code.')
    } catch (error) {
      setVerificationMessage(error instanceof Error ? error.message : 'Could not send the verification code.')
    } finally {
      setVerificationBusy(false)
    }
  }

  const verifyOrderCode = async () => {
    if (!challengeId || !/^\d{6}$/.test(verificationCode)) {
      setVerificationMessage('Enter the 6-digit code from your email.')
      return
    }
    setVerificationBusy(true)
    try {
      const response = await fetch('/api/chat-assistant/order-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', challengeId, code: verificationCode }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.ok) throw new Error(data.error || 'That code is invalid or expired.')
      setVerificationRequired(false)
      setVerificationCode('')
      setVerificationMessage('')
      await loadOrder()
    } catch (error) {
      setVerificationMessage(error instanceof Error ? error.message : 'That code is invalid or expired.')
    } finally {
      setVerificationBusy(false)
    }
  }

  if (verificationRequired) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-dark">Verify Your Order</h1>
          <p className="mt-2 text-sm text-body">For your privacy, this payment link needs verification before order details are shown.</p>
          {!challengeId ? (
            <button type="button" onClick={requestVerification} disabled={verificationBusy} className="btn-primary mt-5 w-full disabled:opacity-50">
              {verificationBusy ? 'Sending code…' : 'Email Me a 6-Digit Code'}
            </button>
          ) : (
            <div className="mt-5 space-y-3">
              <label className="block text-sm font-semibold">Verification code
                <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={verificationCode} onChange={event => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="mt-1 w-full rounded border px-3 py-3 text-center text-xl tracking-[0.35em]" />
              </label>
              <button type="button" onClick={verifyOrderCode} disabled={verificationBusy || verificationCode.length !== 6} className="btn-primary w-full disabled:opacity-50">
                {verificationBusy ? 'Verifying…' : 'Verify & Open Order'}
              </button>
              <button type="button" onClick={requestVerification} disabled={verificationBusy} className="w-full text-sm text-secondary underline">Send a new code</button>
            </div>
          )}
          {verificationMessage && <p role="status" className="mt-4 text-sm text-body">{verificationMessage}</p>}
          <p className="mt-5 text-xs text-gray-500">The code is sent only to the email already saved on this reservation. Need help? Call or text {BUSINESS.phone}.</p>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-dark mb-4">Quote Not Found</h1>
        <p className="text-body">This payment link is invalid or has expired. Please contact us at {BUSINESS.phone}.</p>
      </div>
    )
  }

  if (!order) {
    return <div className="max-w-2xl mx-auto px-4 py-12 text-center">Loading...</div>
  }

  if (order.status === 'canceled') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-dark mb-4">Order Canceled</h1>
        <p className="text-body mb-2">Order #{order.orderNumber} has been canceled.</p>
        {order.payments && order.payments.length > 0 && (
          <div className="text-body text-sm mb-2 space-y-1">
            {order.payments.filter((p) => p.amount > 0).map((p, idx) => (
              <p key={`paid-${idx}`}>Paid {formatCurrency(p.amount)} on {formatDateTime(p.createdAt)}</p>
            ))}
            {order.payments.filter((p) => p.amount < 0).map((p, idx) => (
              <p key={`refund-${idx}`}>Refunded {formatCurrency(Math.abs(p.amount))} on {formatDateTime(p.createdAt)}</p>
            ))}
          </div>
        )}
        <p className="text-body mt-4">If you have any questions, please contact us at {BUSINESS.phone}.</p></div>
    )
  }

  if (paid) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-dark mb-4">Thank You!</h1>
        <p className="text-body mb-4">Your payment has been received for Order #{order.orderNumber}.</p>
        {receipt ? <PaymentReceiptSummary receipt={receipt} /> : <p className="text-body mt-4">Please contact us at {BUSINESS.phone} if you need a copy of your verified receipt.</p>}
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
          <p className="text-sm text-body">{order.eventAddress}, {order.eventCity} {order.eventState || 'NY'} {order.eventZip}</p>
        )}
        <p className="text-sm text-body">Delivery: {order.deliveryType}</p>
      </div>

        <div className="bg-gray-50 p-6 rounded-lg mb-8">
          <h2 className="font-bold text-dark mb-3">Items</h2>
          {!canSelfEdit && order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm py-1 border-b">
              <span>{item.itemName} x{item.quantity}</span>
              <span>{formatCurrency(item.total)}</span>
            </div>
          ))}
          {!canSelfEdit && (
            <p className="text-sm text-body mt-3">
              Need to add or change items? Please call us at {BUSINESS.phone}.
            </p>
          )}
          {canSelfEdit && (
            <div>
              {editItems.map((item, idx) => (
                <div key={item.itemId + idx} className="flex items-center justify-between text-sm py-2 border-b gap-2">
                  <span className="flex-1">{item.itemName}</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => changeQty(idx, -1)} className="w-6 h-6 border rounded">-</button>
                    <span className="w-6 text-center">{item.quantity}</span>
                    <button type="button" onClick={() => changeQty(idx, 1)} className="w-6 h-6 border rounded">+</button>
                  </div>
                  <span className="w-20 text-right">{formatCurrency(item.quantity * item.unitPrice)}</span>
                  <button type="button" onClick={() => removeEditItem(idx)} className="text-red-600 text-xs">Remove</button>
                </div>
              ))}
              <div className="mt-4 relative">
                <input
                  type="text"
                  value={addQuery}
                  onChange={(e) => searchCatalog(e.target.value)}
                  placeholder="Add an item..."
                  className="w-full border rounded px-3 py-2 text-sm"
                />
                {addResults.length > 0 && (
                  <div className="absolute z-10 bg-white border rounded w-full mt-1 shadow">
                    {addResults.map((r) => (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => addCatalogItem(r)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex justify-between"
                      >
                        <span>{r.name}</span>
                        <span>{formatCurrency(r.cost)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={saveItemChanges}
                disabled={savingItems}
                className="btn-primary mt-4 disabled:opacity-50"
              >
                {savingItems ? 'Saving...' : 'Save Changes'}
              </button>
              <p className="text-xs text-body mt-2">
                Changes save immediately and update your total below. Once your order is booked, please call {BUSINESS.phone} for further changes.
              </p>
            </div>
          )}
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
        <div className={`p-6 rounded-lg mb-8 ${alreadyFullyPaid ? 'bg-secondary/5 border border-secondary/20' : 'bg-gray-50'}`}>
          {alreadyFullyPaid ? (
            <>
              <h2 className="font-semibold text-dark mb-2 text-lg">You're All Paid Up! 🎉</h2>
              <p className="text-sm text-body mb-4">Thanks so much for choosing Friendly Party Rental NYC! If you'd like to leave something extra for the crew, it's always appreciated — totally up to you.</p>
            </>
          ) : (
            <>
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
              </div>
            </>
          )}

          <div className={alreadyFullyPaid ? '' : 'mt-4'}>
            <label className="block text-sm text-body mb-2">{alreadyFullyPaid ? 'Add a tip for the crew?' : 'Add a Tip (optional)'}</label>
            <div className="flex flex-wrap gap-2 mb-2">
              <button type="button" onClick={applyTipNone} className="px-3 py-1 rounded-full text-sm text-gray-400 hover:text-gray-600">No tip, thanks</button>
              <button type="button" onClick={applyTip10} className="px-3 py-1 rounded-full border border-secondary/30 text-sm text-secondary hover:bg-secondary/10 transition">10%</button>
              <button type="button" onClick={applyTip15} className="px-3 py-1 rounded-full border border-secondary/30 text-sm text-secondary hover:bg-secondary/10 transition">15%</button>
              <button type="button" onClick={applyTip20} className="px-3 py-1 rounded-full border border-secondary/30 text-sm text-secondary hover:bg-secondary/10 transition">20%</button>
              <input type="number" min="0" step="0.01" placeholder="Custom $" value={customTip} onChange={handleCustomTip} className="w-24 border border-gray-300 rounded-full px-3 py-1 text-sm" />
            </div>
            {tipAmount > 0 && (
              <p className="text-sm text-secondary font-medium">Thank you! Adding a {formatCurrency(tipAmount)} tip for the crew.</p>
            )}
          </div>
        </div>
      )}
      <div className="bg-gray-50 p-6 rounded-lg mb-8 space-y-3">
        <div className="flex justify-between font-bold text-dark text-lg">
          <span>Amount Due Now</span>
          <span className="text-secondary">{formatCurrency(amountDue)}</span>
        </div>
        {!alreadyFullyPaid && (
          <div className="flex justify-between text-body text-sm">
            <span>Remaining Balance After This Payment</span>
            <span>{formatCurrency(Math.max(order.balanceDue - baseAmountDue, 0))}</span>
          </div>
        )}
      </div>

      {!clientSecret && (
        <>
          <PaymentCardAuthorization checked={saveCard} onChange={setSaveCard} required={false} compact />
          {paymentsAvailable === false && (
            <div role="alert" className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm text-amber-900">
              Online payment is temporarily unavailable. Please call Friendly Party Rental NYC at <a href="tel:{BUSINESS.phone}" className="underline">{BUSINESS.phone}</a>. No card has been charged.
            </div>
          )}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-body">
            <p>Payment is processed securely through Stripe.</p>
          </div>
          <button
            onClick={handlePay}
            disabled={loading || paymentsAvailable !== true || amountDue <= 0}
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
