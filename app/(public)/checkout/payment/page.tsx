'use client'

import { useEffect, useState, useRef, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Elements } from '@stripe/react-stripe-js'
import { useCart } from '@/components/public/CartContext'
import { formatCurrency } from '@/lib/utils'
import { getStripe } from '@/lib/stripe-client'
import CardPaymentForm from '@/components/public/CardPaymentForm'

interface PricingTier {
  id: string
  label: string
  minDays: number
  maxDays: number | null
  percent: number
}

interface SpecialRequestFee {
  id: string
  name: string
  amount: number
}

export default function PaymentPage() {
  const router = useRouter()
  const { items, subtotal, eventDate, eventTimeSlot, pickupTimeSlot, clearCart, loaded } = useCart()
  const [loading, setLoading] = useState(false)
  const [depositPct, setDepositPct] = useState(25)
  const [depositIsFixed, setDepositIsFixed] = useState(false)
  const [taxRatePct, setTaxRatePct] = useState(8)
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [deliveryDistance, setDeliveryDistance] = useState<number | null>(null)
  const [deliveryError, setDeliveryError] = useState<string | null>(null)
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponMessage, setCouponMessage] = useState<string | null>(null)
  const [damageWaiver, setDamageWaiver] = useState(false); const [deliveryTypeState, setDeliveryTypeState] = useState('delivery'); const [tipAmount, setTipAmount] = useState(0); const [customTip, setCustomTip] = useState(''); const [saveCard, setSaveCard] = useState(false); const [lastMinuteFeeAccepted, setLastMinuteFeeAccepted] = useState(false)
  const [paymentChoice, setPaymentChoice] = useState<'deposit' | 'full' | 'custom'>('deposit')
  const [customPayAmount, setCustomPayAmount] = useState('')
  const [durationTier, setDurationTier] = useState<PricingTier | null>(null)
  const [selectedFees, setSelectedFees] = useState<SpecialRequestFee[]>([])
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const paymentSucceededRef = useRef(false)

  useEffect(() => {
    if (paymentSucceededRef.current) return
    if (!loaded) return
    const raw = sessionStorage.getItem('checkout_data')
    if (!raw || !items.length || !eventDate) {
      router.push('/checkout')
      return
    }
    const checkoutData = JSON.parse(raw)

    fetch('/api/deposit-rule')
      .then((r) => r.json())
      .then((data) => {
        const rule = data.rule
        if (rule?.type === 'percentage') {
          setDepositPct(rule.amount)
          setDepositIsFixed(false)
        } else {
          setDepositPct(rule?.amount || 0)
          setDepositIsFixed(true)
        }
      })
      .catch(() => {})

    fetch('/api/tax-rate')
      .then((r) => r.json())
      .then((data) => setTaxRatePct(data.rate?.rate ?? 8))
      .catch(() => {})

    fetch('/api/pricing-tiers')
      .then((r) => r.json())
      .then((data) => {
        const tiers: PricingTier[] = data.tiers || []
        const match = tiers.find((t) => t.id === checkoutData.durationTierId) || tiers[0]
        setDurationTier(match || null)
      })
      .catch(() => {})

    fetch('/api/special-request-fees')
      .then((r) => r.json())
      .then((data) => {
        const allFees: SpecialRequestFee[] = data.fees || []
        const chosenIds: string[] = Array.isArray(checkoutData.specialRequests) ? checkoutData.specialRequests : (checkoutData.specialRequests ? [checkoutData.specialRequests] : [])
        setSelectedFees(allFees.filter((f) => chosenIds.includes(f.id)))
      })
      .catch(() => {})

    if (checkoutData.eventZip && checkoutData.deliveryType !== 'pickup') {
      fetch(`/api/delivery-fee?zip=${encodeURIComponent(checkoutData.eventZip)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.error) {
            setDeliveryError(data.error)
            setDeliveryFee(0)
          } else {
            setDeliveryFee(data.fee || 0)
            setDeliveryDistance(data.distance ?? null)
          }
        })
        .catch(() => setDeliveryFee(0))
    } else {
      setDeliveryFee(0)
      setDeliveryDistance(null)
      setDeliveryError(null)
    }

    if (checkoutData.couponCode) {
      fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: checkoutData.couponCode, subtotal }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.valid) {
            setCouponDiscount(data.discount || 0)
            setCouponMessage(data.message)
          } else {
            setCouponMessage(data.message || 'Invalid coupon')
          }
        })
        .catch(() => {})
    }

    setDamageWaiver(!!checkoutData.damageWaiver); setDeliveryTypeState(checkoutData.deliveryType || 'delivery')
  }, [items, eventDate, subtotal, router, loaded])

  const durationFee = durationTier ? Math.round(subtotal * (durationTier.percent / 100) * 100) / 100 : 0
  const specialRequestTotal = selectedFees.reduce((sum, f) => sum + f.amount, 0)
  const adjustedSubtotal = Math.round((subtotal + durationFee) * 100) / 100
  const hoursUntilEvent = eventDate ? (new Date(eventDate).getTime() - Date.now()) / (1000 * 60 * 60) : 999
  const isHardBlocked = hoursUntilEvent < 24
  const isLastMinuteBooking = hoursUntilEvent >= 24 && hoursUntilEvent < 72
  const lastMinuteFee = isLastMinuteBooking ? 49.99 : 0
  const damageWaiverFee = damageWaiver ? Math.round(adjustedSubtotal * 0.10 * 100) / 100 : 0
  const taxableBase = Math.max(adjustedSubtotal - couponDiscount, 0) + deliveryFee + damageWaiverFee + specialRequestTotal + lastMinuteFee
  const taxAmount = Math.round(taxableBase * (taxRatePct / 100) * 100) / 100
  const grandTotal = Math.max(adjustedSubtotal - couponDiscount, 0) + deliveryFee + damageWaiverFee + specialRequestTotal + taxAmount + lastMinuteFee
  const depositAmount = depositIsFixed ? Math.min(depositPct, grandTotal) : Math.round(grandTotal * (depositPct / 100) * 100) / 100
  const minimumOrder = deliveryTypeState === 'pickup' ? 50 : 100
  const belowMinimum = subtotal > 0 && subtotal < minimumOrder
  const parsedCustomPayAmount = Math.max(0, parseFloat(customPayAmount) || 0)
  const paymentPrincipal = paymentChoice === 'full' ? grandTotal : paymentChoice === 'custom' ? Math.min(Math.max(parsedCustomPayAmount, depositAmount), grandTotal) : depositAmount
  const balanceDue = Math.round((grandTotal - paymentPrincipal) * 100) / 100
  const amountDueToday = Math.round((paymentPrincipal + tipAmount) * 100) / 100
  const applyTipNone = () => { setCustomTip(''); setTipAmount(0) }
  const applyTip10 = () => { setCustomTip(''); setTipAmount(Math.round(grandTotal * 0.1 * 100) / 100) }
  const applyTip15 = () => { setCustomTip(''); setTipAmount(Math.round(grandTotal * 0.15 * 100) / 100) }
  const applyTip20 = () => { setCustomTip(''); setTipAmount(Math.round(grandTotal * 0.2 * 100) / 100) }
  const applyCustomTip = (e: ChangeEvent<HTMLInputElement>) => { setCustomTip(e.target.value); setTipAmount(Math.max(0, parseFloat(e.target.value) || 0)) }

  const finalizeOrder = (finalOrderNumber: string) => {
    sessionStorage.setItem('order_confirmation', JSON.stringify({
      orderNumber: finalOrderNumber,
      orderId,
      depositAmount: paymentPrincipal,
      tipAmount,
      balanceDue,
      totalAmount: grandTotal,
    }))
    paymentSucceededRef.current = true
    clearCart()
    sessionStorage.removeItem('checkout_data')
    router.push('/checkout/confirmation')
  }

  const confirmPayment = async (finalOrderNumber: string, finalOrderId: string, stripePaymentId?: string) => {
    await fetch(`/api/orders/${finalOrderId}/confirm-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amountDueToday, stripePaymentId, saveCard }),
    })
    finalizeOrder(finalOrderNumber)
  }

  const handleContinue = async () => {
    if (isHardBlocked) { toast.error('Orders cannot be placed within 24 hours of the event date. Please call our office for last-minute availability.'); return }
    if (belowMinimum) { toast.error(`Minimum order is $${minimumOrder} for ${deliveryTypeState === 'pickup' ? 'pickup' : 'delivery'} orders`); return }
    if (isLastMinuteBooking && !lastMinuteFeeAccepted) { toast.error('Please accept the last-minute booking fee to continue'); return }
    if (paymentChoice === 'custom' && parsedCustomPayAmount < depositAmount) { toast.error(`Custom payment amount must be at least the deposit of ${formatCurrency(depositAmount)}`); return }
    const checkoutData = JSON.parse(sessionStorage.getItem('checkout_data') || '{}')
    setLoading(true)

    try {
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...checkoutData,
          eventDate,
          eventTimeSlot,
          items: items.map((i) => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.price,
          })),
          subtotal: adjustedSubtotal,
          rentalDays: durationTier?.minDays || 1,
          durationLabel: durationTier?.label || null,
          durationFee,
          specialRequestFee: specialRequestTotal,
          specialRequestNames: selectedFees.map((f) => f.name).join(', ') || null,
          deliveryFee,
          deliveryDistance,
          taxRate: taxRatePct,
          taxAmount,
          couponCode: couponDiscount > 0 ? checkoutData.couponCode : null,
          couponDiscount,
          damageWaiver,
          damageWaiverFee,
          totalAmount: grandTotal,
          depositAmount: paymentPrincipal,
          pickupTimeSlot,
          tipAmount,
          lastMinuteFeeAmount: lastMinuteFee,
        }),
      })

      const orderData = await orderRes.json()
      if (!orderRes.ok) throw new Error(orderData.error || 'Order failed')
      setOrderNumber(orderData.order.orderNumber)
      setOrderId(orderData.order.id)

      const paymentRes = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderData.order.id,
          amount: amountDueToday,
          saveCard,
        }),
      })

      const paymentData = await paymentRes.json()
      if (!paymentRes.ok) throw new Error(paymentData.error || 'Payment failed')

      if (paymentData.simulated) {
        await confirmPayment(orderData.order.orderNumber, orderData.order.id, paymentData.paymentIntentId)
      } else {
        setClientSecret(paymentData.clientSecret)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-dark mb-8">Payment</h1>

      <div className="bg-gray-50 p-6 rounded-lg mb-8 space-y-3">
        <div className="flex justify-between text-body">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {durationFee > 0 && (
          <div className="flex justify-between text-body text-sm">
            <span>Multi-Day Rental Fee{durationTier ? ` (${durationTier.label})` : ''}</span>
            <span>{formatCurrency(durationFee)}</span>
          </div>
        )}
        {selectedFees.map((fee) => (
          <div key={fee.id} className="flex justify-between text-body text-sm">
            <span>{fee.name}</span>
            <span>{formatCurrency(fee.amount)}</span>
          </div>
        ))}
        {lastMinuteFee > 0 && (
          <div><span>Last-Minute Booking Fee</span><span>{formatCurrency(lastMinuteFee)}</span></div>
        )}
        {couponDiscount > 0 && (
          <div className="flex justify-between text-green-600 text-sm">
            <span>Coupon Discount</span>
            <span>-{formatCurrency(couponDiscount)}</span>
          </div>
        )}
        {couponMessage && couponDiscount === 0 && (
          <p className="text-red-500 text-xs">{couponMessage}</p>
        )}
        {damageWaiverFee > 0 && (
          <div className="flex justify-between text-body text-sm">
            <span>Damage Waiver (10%)</span>
            <span>{formatCurrency(damageWaiverFee)}</span>
          </div>
        )}
        {deliveryTypeState !== 'pickup' && (
          <div className="flex justify-between text-body text-sm">
            <span>Delivery Fee{deliveryDistance != null ? ` (${deliveryDistance} mi)` : ''}</span>
            <span>{formatCurrency(deliveryFee)}</span>
          </div>
        )}
        {deliveryError && <p className="text-red-500 text-xs">{deliveryError}</p>}
        <div className="flex justify-between text-body text-sm">
          <span>Sales Tax ({taxRatePct}%)</span>
          <span>{formatCurrency(taxAmount)}</span>
        </div>
        <div className="flex justify-between font-bold text-dark border-t pt-3">
          <span>Order Total</span>
          <span>{formatCurrency(grandTotal)}</span>
        </div>
        <div className="border-t pt-3">
          <p className="text-sm font-medium text-dark mb-2">How much would you like to pay today?</p>
          <div className="flex flex-wrap gap-2 mb-2">
            <button type="button" onClick={() => { setPaymentChoice('deposit'); setCustomPayAmount('') }} className={`px-3 py-1 rounded border text-sm ${paymentChoice === 'deposit' ? 'border-primary bg-primary/10 text-dark font-medium' : 'border-gray-300 text-body'}`}>Pay Deposit ({formatCurrency(depositAmount)})</button>
            <button type="button" onClick={() => { setPaymentChoice('full'); setCustomPayAmount('') }} className={`px-3 py-1 rounded border text-sm ${paymentChoice === 'full' ? 'border-primary bg-primary/10 text-dark font-medium' : 'border-gray-300 text-body'}`}>Pay Full Balance ({formatCurrency(grandTotal)})</button>
            <button type="button" onClick={() => setPaymentChoice('custom')} className={`px-3 py-1 rounded border text-sm ${paymentChoice === 'custom' ? 'border-primary bg-primary/10 text-dark font-medium' : 'border-gray-300 text-body'}`}>Pay Custom Amount</button>
          </div>
          {paymentChoice === 'custom' && (
            <div>
              <input type="number" min={depositAmount} max={grandTotal} step="0.01" placeholder={`Minimum ${formatCurrency(depositAmount)}`} value={customPayAmount} onChange={(e) => setCustomPayAmount(e.target.value)} className="w-40 border rounded px-2 py-1 text-sm" />
              <p className="text-xs text-gray-500 mt-1">Must be between {formatCurrency(depositAmount)} and {formatCurrency(grandTotal)}.</p>
            </div>
          )}
        </div>
        <div className="border-t pt-3">
          <p className="text-sm font-medium text-dark mb-2">{deliveryTypeState === 'pickup' ? 'Add a tip for the team' : 'Add a tip for your delivery crew'}</p>
          <div className="flex flex-wrap gap-2 mb-2">
            <button type="button" onClick={applyTipNone} className="px-3 py-1 rounded border border-gray-300 text-sm text-body">No Tip</button>
            <button type="button" onClick={applyTip10} className="px-3 py-1 rounded border border-gray-300 text-sm text-body">10%</button>
            <button type="button" onClick={applyTip15} className="px-3 py-1 rounded border border-gray-300 text-sm text-body">15%</button>
            <button type="button" onClick={applyTip20} className="px-3 py-1 rounded border border-gray-300 text-sm text-body">20%</button>
            <input type="number" min="0" step="0.01" placeholder="Custom $" value={customTip} onChange={applyCustomTip} className="w-24 border rounded px-2 py-1 text-sm" />
          </div>
          <div className="flex justify-between text-body text-sm">
            <span>Tip</span>
            <span>{formatCurrency(tipAmount)}</span>
          </div>
        </div>
        <div className="flex justify-between font-bold text-dark text-lg border-t pt-3">
          <span>Due Today</span>
          <span className="text-secondary">{formatCurrency(amountDueToday)}</span>
        </div>
        <div className="flex justify-between text-body text-sm">
          <span>{deliveryTypeState === 'pickup' ? 'Balance due before pickup' : 'Balance due before delivery'}</span>
          <span>{formatCurrency(balanceDue)}</span>
        </div>
      </div>

      {!clientSecret && (
        <>
          {belowMinimum && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700">
              Minimum order is {formatCurrency(minimumOrder)} for {deliveryTypeState === 'pickup' ? 'pickup' : 'delivery'} orders. Please go back and add more items.
            </div>
          )}
          {isHardBlocked && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700">
              Orders cannot be placed within 24 hours of the event date. Please call our office to check last-minute availability.
            </div>
          )}
          <label className="flex items-start gap-2 mb-4 text-sm text-body bg-gray-50 border border-gray-200 rounded-lg p-4 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={saveCard}
              onChange={(e) => setSaveCard(e.target.checked)}
            />
            <span>
              Save my card on file and automatically charge my remaining balance 3 days before my event (Autopay). You can cancel anytime by contacting us.
            </span>
          </label>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-body">
            <p>Payment is processed securely through Stripe.</p>
          </div>
          <button
            onClick={handleContinue}
            disabled={loading || belowMinimum || isHardBlocked || (isLastMinuteBooking && !lastMinuteFeeAccepted) || (paymentChoice === 'custom' && parsedCustomPayAmount < depositAmount)}
            className="btn-primary w-full text-lg py-3"
          >
            {loading ? 'Processing...' : `Pay ${formatCurrency(amountDueToday)}`}
          </button>
        </>
      )}

      {clientSecret && orderNumber && orderId && (
        <Elements stripe={getStripe()} options={{ clientSecret }}>
          <CardPaymentForm amount={amountDueToday} onSuccess={(pid) => confirmPayment(orderNumber, orderId, pid)} />
        </Elements>
      )}
      {isLastMinuteBooking && !lastMinuteFeeAccepted && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-bold text-dark mb-3">Last-Minute Booking Fee</h2><p className="text-sm text-body mb-4">Your event is within 72 hours of the scheduled start. A $49.99 last-minute booking fee applies and has been added to your total below.</p><button type="button" onClick={() => setLastMinuteFeeAccepted(true)} className="btn-primary w-full py-3">I Understand, Add the Fee and Continue</button>
          </div>
        </div>
      )}
    </div>
  )
}
