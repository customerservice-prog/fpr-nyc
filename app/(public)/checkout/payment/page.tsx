'use client'

import { useEffect, useState, useRef, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Elements } from '@stripe/react-stripe-js'
import { useCart } from '@/components/public/CartContext'
import { formatCurrency } from '@/lib/utils'
import { getStripe } from '@/lib/stripe-client'
import { normalizeDeliveryZip, requireDeliveryMethod } from '@/lib/delivery'
import CardPaymentForm from '@/components/public/CardPaymentForm'
import PaymentCardAuthorization from '@/components/public/PaymentCardAuthorization'

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
  const { items, subtotal, eventDate, eventTimeSlot, pickupTimeSlot, schedulingDetails, clearCart, loaded } = useCart()
  const [loading, setLoading] = useState(false)
  const [depositPct, setDepositPct] = useState(25)
  const [depositIsFixed, setDepositIsFixed] = useState(false)
  const [taxRatePct, setTaxRatePct] = useState(0)
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [deliveryDistance, setDeliveryDistance] = useState<number | null>(null)
  const [deliveryQuoteZip, setDeliveryQuoteZip] = useState<string | null>(null)
  const [deliveryError, setDeliveryError] = useState<string | null>(null)
  const [deliveryLoading, setDeliveryLoading] = useState(true)
  const [pricingLoading, setPricingLoading] = useState(true)
  const [pricingError, setPricingError] = useState<string | null>(null)
  const [quoteAttempt, setQuoteAttempt] = useState(0)
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponMessage, setCouponMessage] = useState<string | null>(null)
  const [damageWaiver, setDamageWaiver] = useState(false)
  const [tipAmount, setTipAmount] = useState(0)
  const [customTip, setCustomTip] = useState('')
  const [saveCard, setSaveCard] = useState(false)
  const [lastMinuteFeeAccepted, setLastMinuteFeeAccepted] = useState(false)
  const [paymentChoice, setPaymentChoice] = useState<'deposit' | 'full' | 'custom'>('deposit')
  const [customPayAmount, setCustomPayAmount] = useState('')
  const [durationTier, setDurationTier] = useState<PricingTier | null>(null)
  const [selectedFees, setSelectedFees] = useState<SpecialRequestFee[]>([])
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const paymentSucceededRef = useRef(false)
  const draftSyncRef = useRef('')

  useEffect(() => {
    if (paymentSucceededRef.current || !loaded) return
    let checkoutData: any
    try {
      const raw = sessionStorage.getItem('checkout_data')
      if (!raw || !items.length || !eventDate) {
        router.replace('/checkout')
        return
      }
      checkoutData = JSON.parse(raw)
      requireDeliveryMethod(checkoutData?.deliveryType)
    } catch {
      sessionStorage.removeItem('checkout_data')
      router.replace('/checkout')
      return
    }

    const controller = new AbortController()
    let cancelled = false
    const timeout = setTimeout(() => controller.abort(), 12000)
    const fetchJson = async (url: string, init: RequestInit = {}) => {
      const response = await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Pricing is temporarily unavailable. Please retry.')
      return data
    }
    setDeliveryLoading(true)
    setDeliveryError(null)
    setDeliveryQuoteZip(null)
    setDeliveryDistance(null)
    setDeliveryFee(0)
    setPricingLoading(true)
    setPricingError(null)
    setCouponDiscount(0)
    setCouponMessage(null)
    setDamageWaiver(!!checkoutData.damageWaiver)

    const deliveryPromise = (async () => {
      try {
        const zip = normalizeDeliveryZip(checkoutData.eventZip)
        const data = await fetchJson('/api/delivery-fee?zip=' + encodeURIComponent(zip))
        if (data.error || typeof data.fee !== 'number' || !Number.isFinite(data.fee) || data.fee <= 0 || typeof data.distance !== 'number' || !Number.isFinite(data.distance) || data.distance < 0 || data.zip !== zip) {
          throw new Error(data.error || 'A valid delivery quote could not be calculated. Please retry before paying.')
        }
        if (cancelled) return
        setDeliveryFee(data.fee)
        setDeliveryDistance(data.distance)
        setDeliveryQuoteZip(zip)
      } catch (error) {
        if (!cancelled) {
          setDeliveryError(controller.signal.aborted ? 'Delivery pricing timed out. Please retry before paying.' : error instanceof Error ? error.message : 'Delivery pricing is unavailable. Please retry before paying.')
          setDeliveryFee(0)
          setDeliveryDistance(null)
        }
      } finally {
        if (!cancelled) setDeliveryLoading(false)
      }
    })()

    // Never enable payment using a temporary tax/deposit fallback while settings load.
    const pricingPromise = (async () => {
      try {
        const [depositData, taxData, tierData, feeData, couponData] = await Promise.all([
          fetchJson('/api/deposit-rule'),
          fetchJson('/api/tax-rate'),
          fetchJson('/api/pricing-tiers'),
          fetchJson('/api/special-request-fees'),
          checkoutData.couponCode ? fetchJson('/api/coupons/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: checkoutData.couponCode, subtotal }),
          }) : Promise.resolve(null),
        ])
        const rule = depositData.rule
        const rate = taxData.rate?.rate
        if (!rule || typeof rule.amount !== 'number' || !Number.isFinite(rule.amount) || rule.amount < 0 || typeof rate !== 'number' || !Number.isFinite(rate) || rate < 0 || !Array.isArray(tierData.tiers) || !Array.isArray(feeData.fees)) {
          throw new Error('Your order pricing could not be loaded. Please retry before paying.')
        }
        if (cancelled) return
        setDepositPct(rule.amount)
        setDepositIsFixed(rule.type !== 'percentage')
        setTaxRatePct(rate)
        const tiers: PricingTier[] = tierData.tiers
        setDurationTier(tiers.find((tier) => tier.id === checkoutData.durationTierId) || tiers[0] || null)
        const allFees: SpecialRequestFee[] = feeData.fees
        const chosenIds: string[] = Array.isArray(checkoutData.specialRequests) ? checkoutData.specialRequests : checkoutData.specialRequests ? [checkoutData.specialRequests] : []
        setSelectedFees(allFees.filter((fee) => chosenIds.includes(fee.id)))
        if (couponData?.valid) {
          setCouponDiscount(couponData.discount || 0)
          setCouponMessage(couponData.message)
        } else if (couponData) {
          setCouponMessage(couponData.message || 'Invalid coupon')
        }
      } catch (error) {
        if (!cancelled) setPricingError(controller.signal.aborted ? 'Order pricing timed out. Please retry before paying.' : error instanceof Error ? error.message : 'Order pricing is unavailable. Please retry.')
      } finally {
        if (!cancelled) setPricingLoading(false)
      }
    })()

    void Promise.allSettled([deliveryPromise, pricingPromise]).then(() => clearTimeout(timeout))
    return () => {
      cancelled = true
      clearTimeout(timeout)
      controller.abort()
    }
  }, [items, eventDate, subtotal, router, loaded, quoteAttempt])

  const totalsReady = loaded && !deliveryLoading && !deliveryError && !!deliveryQuoteZip && !pricingLoading && !pricingError
  const durationFee = durationTier ? Math.round(subtotal * (durationTier.percent / 100) * 100) / 100 : 0
  const specialRequestTotal = selectedFees.reduce((sum, fee) => sum + fee.amount, 0)
  const adjustedSubtotal = Math.round((subtotal + durationFee) * 100) / 100
  const hoursUntilEvent = eventDate ? (new Date(eventDate).getTime() - Date.now()) / (1000 * 60 * 60) : 999
  const isHardBlocked = hoursUntilEvent < 24
  const isLastMinuteBooking = hoursUntilEvent >= 24 && hoursUntilEvent < 72
  const lastMinuteFee = isLastMinuteBooking ? 49.99 : 0
  const damageWaiverFee = damageWaiver ? Math.round(adjustedSubtotal * 0.10 * 100) / 100 : 0
  const exactDeliveryFee = schedulingDetails?.exactDeliveryFee || 0
  const exactPickupFee = schedulingDetails?.exactPickupFee || 0
  const schedulingFeeTotal = exactDeliveryFee + exactPickupFee
  const taxableBase = Math.max(adjustedSubtotal - couponDiscount, 0) + deliveryFee + damageWaiverFee + specialRequestTotal + lastMinuteFee + schedulingFeeTotal
  const taxAmount = Math.round(taxableBase * (taxRatePct / 100) * 100) / 100
  const grandTotal = Math.max(adjustedSubtotal - couponDiscount, 0) + deliveryFee + damageWaiverFee + specialRequestTotal + taxAmount + lastMinuteFee + schedulingFeeTotal
  const depositAmount = depositIsFixed ? Math.min(depositPct, grandTotal) : Math.round(grandTotal * (depositPct / 100) * 100) / 100
  const minimumOrder = 100
  const belowMinimum = subtotal > 0 && subtotal < minimumOrder
  const parsedCustomPayAmount = Math.max(0, parseFloat(customPayAmount) || 0)
  const paymentPrincipal = paymentChoice === 'full' ? grandTotal : paymentChoice === 'custom' ? Math.min(Math.max(parsedCustomPayAmount, depositAmount), grandTotal) : depositAmount
  const balanceDue = Math.round((grandTotal - paymentPrincipal) * 100) / 100
  const amountDueToday = Math.round((paymentPrincipal + tipAmount) * 100) / 100

  useEffect(() => {
    if (!loaded || !eventDate || !items.length || deliveryLoading || pricingLoading || deliveryError || pricingError) return
    let checkoutData: any
    try { checkoutData = JSON.parse(sessionStorage.getItem('checkout_data') || '{}') } catch { return }
    if (!checkoutData.checkoutDraftKey || !checkoutData.email || !checkoutData.phone) return
    const payload = {
      ...checkoutData,
      stage: 'payment_page',
      eventDate,
      eventTimeSlot,
      pickupTimeSlot,
      deliveryType: 'delivery',
      items: items.map((i) => ({ id: i.id, name: i.selectedColor ? i.name + ' — ' + i.selectedColor : i.name, quantity: i.quantity, unitPrice: i.price })),
      subtotal: adjustedSubtotal,
      rentalDays: durationTier?.minDays || 1,
      durationLabel: durationTier?.label || null,
      durationFee,
      specialRequestFee: specialRequestTotal,
      specialRequestNames: selectedFees.map((fee) => fee.name).join(', ') || null,
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
      tipAmount,
      lastMinuteFeeAmount: lastMinuteFee,
      schedulingDetails: schedulingDetails?.eventStartTime ? schedulingDetails : null,
    }
    const signature = JSON.stringify(payload)
    if (signature === draftSyncRef.current) return
    draftSyncRef.current = signature
    const timer = window.setTimeout(() => {
      fetch('/api/checkout/draft', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      }).catch(() => { draftSyncRef.current = '' })
    }, 350)
    return () => window.clearTimeout(timer)
  }, [loaded, eventDate, eventTimeSlot, pickupTimeSlot, items, adjustedSubtotal, durationTier, durationFee, specialRequestTotal, selectedFees, deliveryFee, deliveryDistance, taxRatePct, taxAmount, couponDiscount, damageWaiver, damageWaiverFee, grandTotal, paymentPrincipal, tipAmount, lastMinuteFee, schedulingDetails, deliveryLoading, pricingLoading, deliveryError, pricingError])

  const applyTipNone = () => { setCustomTip(''); setTipAmount(0) }
  const applyTip10 = () => { setCustomTip(''); setTipAmount(Math.round(grandTotal * 0.1 * 100) / 100) }
  const applyTip15 = () => { setCustomTip(''); setTipAmount(Math.round(grandTotal * 0.15 * 100) / 100) }
  const applyTip20 = () => { setCustomTip(''); setTipAmount(Math.round(grandTotal * 0.2 * 100) / 100) }
  const applyCustomTip = (event: ChangeEvent<HTMLInputElement>) => { setCustomTip(event.target.value); setTipAmount(Math.max(0, parseFloat(event.target.value) || 0)) }
  const pendingTotalLabel = deliveryError || pricingError ? 'Unavailable' : 'Calculating...'

  const finalizeOrder = (finalOrderId: string, stripePaymentId: string) => {
    sessionStorage.setItem('order_confirmation', JSON.stringify({
      orderId: finalOrderId,
      stripePaymentId,
    }))
    paymentSucceededRef.current = true
    clearCart()
    sessionStorage.removeItem('checkout_data')
    sessionStorage.removeItem('checkout_draft_key')
    router.push('/checkout/confirmation')
  }

  const confirmPayment = async (_finalOrderNumber: string, finalOrderId: string, stripePaymentId?: string) => {
    if (!stripePaymentId) throw new Error('Your payment result needs verification. Please contact us before paying again.')
    const response = await fetch('/api/orders/' + finalOrderId + '/confirm-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amountDueToday, stripePaymentId, saveCard }),
    })
    if (!response.ok) throw new Error('Your payment result needs verification. Please contact us before paying again.')
    finalizeOrder(finalOrderId, stripePaymentId)
  }

  const handleContinue = async () => {
    if (!totalsReady) { toast.error(deliveryError || pricingError || 'Please wait for your delivery quote and order pricing.'); return }
    if (isHardBlocked) { toast.error('Orders cannot be placed within 24 hours of the event date. Please call our office for last-minute availability.'); return }
    if (belowMinimum) { toast.error('Minimum order is $' + minimumOrder + ' for delivery orders'); return }
    if (isLastMinuteBooking && !lastMinuteFeeAccepted) { toast.error('Please accept the last-minute booking fee to continue'); return }
    if (paymentChoice === 'custom' && parsedCustomPayAmount < depositAmount) { toast.error('Custom payment amount must be at least the deposit of ' + formatCurrency(depositAmount)); return }
    setLoading(true)

    try {
      const checkoutData = JSON.parse(sessionStorage.getItem('checkout_data') || '{}')
      requireDeliveryMethod(checkoutData.deliveryType)
      if (normalizeDeliveryZip(checkoutData.eventZip) !== deliveryQuoteZip) {
        setDeliveryError('Your delivery address changed. Refresh your quote and review the new total before paying.')
        return
      }
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...checkoutData,
          deliveryType: 'delivery',
          eventDate,
          eventTimeSlot,
          items: items.map((item) => ({ id: item.id, name: item.name, quantity: item.quantity, unitPrice: item.price })),
          subtotal: adjustedSubtotal,
          rentalDays: durationTier?.minDays || 1,
          durationLabel: durationTier?.label || null,
          durationFee,
          specialRequestFee: specialRequestTotal,
          specialRequestNames: selectedFees.map((fee) => fee.name).join(', ') || null,
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
          schedulingDetails: schedulingDetails && schedulingDetails.eventStartTime ? schedulingDetails : null,
        }),
      })

      const orderData = await orderRes.json()
      if (orderData.requiresAssistance) {
        router.push('/checkout/assistance')
        return
      }
      if (!orderRes.ok) {
        if (orderRes.status === 409) setDeliveryError(orderData.error || 'Please refresh your delivery quote.')
        throw new Error(orderData.error || 'Order failed')
      }
      setOrderNumber(orderData.order.orderNumber)
      setOrderId(orderData.order.id)

      const paymentRes = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderData.order.id, amount: amountDueToday, saveCard }),
      })
      const paymentData = await paymentRes.json()
      if (!paymentRes.ok) throw new Error(paymentData.error || 'Payment failed')
      if (paymentData.simulated) {
        await confirmPayment(orderData.order.orderNumber, orderData.order.id, paymentData.paymentIntentId)
      } else {
        setClientSecret(paymentData.clientSecret)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-dark mb-3">Payment</h1>
      <p className="text-sm text-body mb-8">Delivery only in Greenville. Warehouse pickup is not available. Our crew will collect your rentals from your event afterward.</p>
      <div className="bg-gray-50 p-6 rounded-lg mb-8 space-y-3">
        <div className="flex justify-between text-body"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
        {durationFee > 0 && <div className="flex justify-between text-body text-sm"><span>Multi-Day Rental Fee{durationTier ? ' (' + durationTier.label + ')' : ''}</span><span>{formatCurrency(durationFee)}</span></div>}
        {selectedFees.map((fee) => <div key={fee.id} className="flex justify-between text-body text-sm"><span>{fee.name}</span><span>{formatCurrency(fee.amount)}</span></div>)}
        {exactDeliveryFee > 0 && <div className="flex justify-between text-body text-sm"><span>Exact-Time Delivery Fee</span><span>{formatCurrency(exactDeliveryFee)}</span></div>}
        {exactPickupFee > 0 && <div className="flex justify-between text-body text-sm"><span>Exact-Time Event Collection Fee</span><span>{formatCurrency(exactPickupFee)}</span></div>}
        {lastMinuteFee > 0 && <div className="flex justify-between text-body text-sm"><span>Last-Minute Booking Fee</span><span>{formatCurrency(lastMinuteFee)}</span></div>}
        {couponDiscount > 0 && <div className="flex justify-between text-green-600 text-sm"><span>Coupon Discount</span><span>-{formatCurrency(couponDiscount)}</span></div>}
        {couponMessage && couponDiscount === 0 && <p className="text-red-500 text-xs">{couponMessage}</p>}
        {damageWaiverFee > 0 && <div className="flex justify-between text-body text-sm"><span>Damage Waiver (10%)</span><span>{formatCurrency(damageWaiverFee)}</span></div>}
        <div className="flex justify-between text-body text-sm" aria-live="polite">
          <span>Estimated Delivery Fee</span>
          <span>{deliveryLoading ? 'Calculating...' : deliveryError ? 'Unavailable' : formatCurrency(deliveryFee)}</span>
        </div>
        {!deliveryLoading && !deliveryError && deliveryQuoteZip && <p className="text-xs text-gray-500">ZIP-based estimate for {deliveryQuoteZip}{deliveryDistance != null && deliveryDistance > 0 ? ' (approximately ' + deliveryDistance + ' straight-line miles)' : ''}. This is not a street-address or driving-distance measurement.</p>}
        {(deliveryError || pricingError) && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {deliveryError && <p>{deliveryError}</p>}
          {pricingError && <p>{pricingError}</p>}
          <button type="button" disabled={loading || deliveryLoading || pricingLoading} onClick={() => setQuoteAttempt((attempt) => attempt + 1)} className="mt-2 underline font-medium">Retry delivery quote and pricing</button>
          <button type="button" onClick={() => router.push('/checkout')} className="ml-4 mt-2 underline">Edit delivery address</button>
        </div>}
        <div className="flex justify-between text-body text-sm"><span>Sales Tax{!pricingLoading && !pricingError ? ' (' + taxRatePct + '%)' : ''}</span><span>{totalsReady ? formatCurrency(taxAmount) : pendingTotalLabel}</span></div>
        <div className="flex justify-between font-bold text-dark border-t pt-3"><span>Order Total</span><span>{totalsReady ? formatCurrency(grandTotal) : pendingTotalLabel}</span></div>
        <fieldset disabled={!totalsReady || !!clientSecret || loading} className="border-t pt-3 disabled:opacity-60">
          <legend className="sr-only">Payment amount and optional tip</legend>
          <p className="text-sm font-medium text-dark mb-2">How much would you like to pay today?</p>
          <div className="flex flex-wrap gap-2 mb-2">
            <button type="button" onClick={() => { setPaymentChoice('deposit'); setCustomPayAmount('') }} className={`px-3 py-1 rounded border text-sm ${paymentChoice === 'deposit' ? 'border-primary bg-primary/10 text-dark font-medium' : 'border-gray-300 text-body'}`}>Pay Deposit{totalsReady ? ' (' + formatCurrency(depositAmount) + ')' : ''}</button>
            <button type="button" onClick={() => { setPaymentChoice('full'); setCustomPayAmount('') }} className={`px-3 py-1 rounded border text-sm ${paymentChoice === 'full' ? 'border-primary bg-primary/10 text-dark font-medium' : 'border-gray-300 text-body'}`}>Pay Full Balance{totalsReady ? ' (' + formatCurrency(grandTotal) + ')' : ''}</button>
            <button type="button" onClick={() => setPaymentChoice('custom')} className={`px-3 py-1 rounded border text-sm ${paymentChoice === 'custom' ? 'border-primary bg-primary/10 text-dark font-medium' : 'border-gray-300 text-body'}`}>Pay Custom Amount</button>
          </div>
          {paymentChoice === 'custom' && <div>
            <input type="number" min={depositAmount} max={grandTotal} step="0.01" placeholder={`Minimum ${formatCurrency(depositAmount)}`} value={customPayAmount} onChange={(event) => setCustomPayAmount(event.target.value)} className="w-40 border rounded px-2 py-1 text-sm" />
            <p className="text-xs text-gray-500 mt-1">Must be between {formatCurrency(depositAmount)} and {formatCurrency(grandTotal)}.</p>
          </div>}
          <div className="border-t pt-3 mt-3">
            <p className="text-sm font-medium text-dark mb-2">Add a tip for your delivery crew</p>
            <div className="flex flex-wrap gap-2 mb-2">
              <button type="button" onClick={applyTipNone} className="px-3 py-1 rounded border border-gray-300 text-sm text-body">No Tip</button>
              <button type="button" onClick={applyTip10} className="px-3 py-1 rounded border border-gray-300 text-sm text-body">10%</button>
              <button type="button" onClick={applyTip15} className="px-3 py-1 rounded border border-gray-300 text-sm text-body">15%</button>
              <button type="button" onClick={applyTip20} className="px-3 py-1 rounded border border-gray-300 text-sm text-body">20%</button>
              <input type="number" min="0" step="0.01" placeholder="Custom $" value={customTip} onChange={applyCustomTip} className="w-24 border rounded px-2 py-1 text-sm" />
            </div>
            <div className="flex justify-between text-body text-sm"><span>Tip</span><span>{formatCurrency(tipAmount)}</span></div>
          </div>
        </fieldset>
        <div className="flex justify-between font-bold text-dark text-lg border-t pt-3"><span>Due Today</span><span className="text-secondary">{totalsReady ? formatCurrency(amountDueToday) : pendingTotalLabel}</span></div>
        <div className="flex justify-between text-body text-sm"><span>Balance due before delivery</span><span>{totalsReady ? formatCurrency(balanceDue) : pendingTotalLabel}</span></div>
      </div>

      {!clientSecret && <>
        {belowMinimum && <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700">Minimum order is {formatCurrency(minimumOrder)} for delivery orders. Please go back and add more items.</div>}
        {isHardBlocked && <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700">Orders cannot be placed within 24 hours of the event date. Please call our office to check last-minute availability.</div>}
        <PaymentCardAuthorization checked={saveCard} onChange={setSaveCard} required={false} compact />
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-body"><p>Payment is processed securely through Stripe.</p></div>
        <button onClick={handleContinue} disabled={loading || !totalsReady || belowMinimum || isHardBlocked || (isLastMinuteBooking && !lastMinuteFeeAccepted) || (paymentChoice === 'custom' && parsedCustomPayAmount < depositAmount)} className="btn-primary w-full text-lg py-3">
          {loading ? 'Processing...' : !totalsReady ? deliveryError || pricingError ? 'Resolve pricing to continue' : 'Calculating your total...' : `Pay ${formatCurrency(amountDueToday)}`}
        </button>
      </>}
      {clientSecret && orderNumber && orderId && <Elements stripe={getStripe()} options={{ clientSecret }}><CardPaymentForm amount={amountDueToday} onSuccess={(paymentId) => confirmPayment(orderNumber, orderId, paymentId)} /></Elements>}
      {isLastMinuteBooking && !lastMinuteFeeAccepted && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-lg font-bold text-dark mb-3">Last-Minute Booking Fee</h2>
        <p className="text-sm text-body mb-4">Your event is within 72 hours of the scheduled start. A $49.99 last-minute booking fee applies and has been added to your total below.</p>
        <button type="button" onClick={() => setLastMinuteFeeAccepted(true)} className="btn-primary w-full py-3">I Understand, Add the Fee and Continue</button>
      </div></div>}
    </div>
  )
}
