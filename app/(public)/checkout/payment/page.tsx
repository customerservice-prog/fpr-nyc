'use client'

import { useEffect, useState, useRef, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Elements } from '@stripe/react-stripe-js'
import { useCart } from '@/components/public/CartContext'
import { BUSINESS, formatCurrency } from '@/lib/utils'
import { getStripe } from '@/lib/stripe-client'
import { normalizeDeliveryZip, requireDeliveryMethod } from '@/lib/delivery'
import { formatTaxRatePercent } from '@/lib/nycSalesTax'
import type { CheckoutPricingResult } from '@/lib/nycCheckoutPricing'
import CardPaymentForm from '@/components/public/CardPaymentForm'
import PaymentCardAuthorization from '@/components/public/PaymentCardAuthorization'

// Every amount on this page comes from the server (POST /api/checkout/quote), which
// runs the same pricing function the order API uses. The page never recomputes
// prices, fees, tax or the deposit itself, so the total a customer sees is the total
// the server will accept; if anything changes in between, the order API refuses it.

const round2 = (value: number) => Math.round(value * 100) / 100

export default function PaymentPage() {
  const router = useRouter()
  const { items, eventDate, eventTimeSlot, pickupTimeSlot, schedulingDetails, clearCart, loaded } = useCart()
  const [loading, setLoading] = useState(false)
  const [quote, setQuote] = useState<CheckoutPricingResult | null>(null)
  const [deliveryQuoteZip, setDeliveryQuoteZip] = useState<string | null>(null)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [quoteCode, setQuoteCode] = useState<string | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(true)
  const [quoteAttempt, setQuoteAttempt] = useState(0)
  const [requestedCoupon, setRequestedCoupon] = useState<string | null>(null)
  const [tipAmount, setTipAmount] = useState(0)
  const [customTip, setCustomTip] = useState('')
  const [saveCard, setSaveCard] = useState(false)
  const [lastMinuteFeeAccepted, setLastMinuteFeeAccepted] = useState(false)
  const [paymentChoice, setPaymentChoice] = useState<'deposit' | 'full' | 'custom'>('deposit')
  const [customPayAmount, setCustomPayAmount] = useState('')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const paymentSucceededRef = useRef(false)
  const draftSyncRef = useRef('')
  // Server-enforced go-live state. The APIs refuse orders and payments regardless;
  // this only keeps customers from starting a checkout that cannot be paid.
  const [checkoutAvailable, setCheckoutAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/payments/status', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => { if (active) setCheckoutAvailable(data?.onlineCheckoutAvailable === true) })
      .catch(() => { if (active) setCheckoutAvailable(false) })
    return () => { active = false }
  }, [])

  const schedulingForServer = schedulingDetails && schedulingDetails.eventStartTime ? schedulingDetails : null

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
    setQuoteLoading(true)
    setQuoteError(null)
    setQuoteCode(null)
    setQuote(null)
    setDeliveryQuoteZip(null)
    setRequestedCoupon(typeof checkoutData.couponCode === 'string' && checkoutData.couponCode.trim() ? checkoutData.couponCode.trim() : null)

    ;(async () => {
      try {
        const zip = normalizeDeliveryZip(checkoutData.eventZip)
        // Only pricing inputs are sent; contact details are not needed for a quote.
        const response = await fetch('/api/checkout/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          cache: 'no-store',
          body: JSON.stringify({
            deliveryType: 'delivery',
            eventDate,
            eventZip: zip,
            items: items.map((item) => ({ id: item.id, quantity: item.quantity })),
            durationTierId: checkoutData.durationTierId || null,
            specialRequests: checkoutData.specialRequests || [],
            couponCode: checkoutData.couponCode || null,
            damageWaiver: !!checkoutData.damageWaiver,
            schedulingDetails: schedulingForServer,
            tipAmount: 0,
          }),
        })
        const data = await response.json().catch(() => null)
        if (cancelled) return
        if (!response.ok || !data?.pricing) {
          setQuoteError(typeof data?.error === 'string' ? data.error : 'Pricing is temporarily unavailable. Please retry before paying.')
          setQuoteCode(typeof data?.code === 'string' ? data.code : null)
          return
        }
        const pricing = data.pricing as CheckoutPricingResult
        if (pricing.taxJurisdiction?.zip !== zip || !Number.isFinite(pricing.grandTotal) || pricing.grandTotal <= 0) {
          throw new Error('Your order pricing could not be confirmed. Please retry before paying.')
        }
        setQuote(pricing)
        setDeliveryQuoteZip(zip)
      } catch (error) {
        if (!cancelled) {
          setQuoteError(controller.signal.aborted ? 'Pricing timed out. Please retry before paying.' : error instanceof Error ? error.message : 'Pricing is unavailable. Please retry before paying.')
        }
      } finally {
        clearTimeout(timeout)
        if (!cancelled) setQuoteLoading(false)
      }
    })()

    return () => {
      cancelled = true
      clearTimeout(timeout)
      controller.abort()
    }
  }, [items, eventDate, router, loaded, quoteAttempt, schedulingForServer])

  const totalsReady = loaded && !quoteLoading && !quoteError && !!quote && !!deliveryQuoteZip
  const grandTotal = quote?.grandTotal ?? 0
  const depositAmount = quote?.requiredDeposit ?? 0
  const needsLastMinuteAcceptance = !!quote && quote.lastMinuteFee > 0 && !lastMinuteFeeAccepted
  const parsedCustomPayAmount = Math.max(0, parseFloat(customPayAmount) || 0)
  const paymentPrincipal = paymentChoice === 'full' ? grandTotal : paymentChoice === 'custom' ? Math.min(Math.max(parsedCustomPayAmount, depositAmount), grandTotal) : depositAmount
  const balanceDue = round2(grandTotal - paymentPrincipal)
  const amountDueToday = round2(paymentPrincipal + tipAmount)

  useEffect(() => {
    if (!loaded || !eventDate || !items.length || !quote) return
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
      couponCode: quote.couponCode,
      depositAmount: paymentPrincipal,
      tipAmount,
      schedulingDetails: schedulingForServer,
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
  }, [loaded, eventDate, eventTimeSlot, pickupTimeSlot, items, quote, paymentPrincipal, tipAmount, schedulingForServer])

  const applyTipNone = () => { setCustomTip(''); setTipAmount(0) }
  const applyTipPercent = (percent: number) => { setCustomTip(''); setTipAmount(round2(grandTotal * percent)) }
  const applyCustomTip = (event: ChangeEvent<HTMLInputElement>) => { setCustomTip(event.target.value); setTipAmount(Math.max(0, parseFloat(event.target.value) || 0)) }
  const pendingTotalLabel = quoteError ? 'Unavailable' : 'Calculating...'

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
    if (checkoutAvailable !== true) { toast.error('Online payment is temporarily unavailable. Please call ' + BUSINESS.name + ' at ' + BUSINESS.phone + ' to book.'); return }
    if (!totalsReady) { toast.error(quoteError || 'Please wait for your order total.'); return }
    if (!quote) return
    if (needsLastMinuteAcceptance) { toast.error('Please accept the last-minute booking fee to continue'); return }
    if (paymentChoice === 'custom' && parsedCustomPayAmount < depositAmount) { toast.error('Custom payment amount must be at least the deposit of ' + formatCurrency(depositAmount)); return }
    setLoading(true)

    try {
      const checkoutData = JSON.parse(sessionStorage.getItem('checkout_data') || '{}')
      requireDeliveryMethod(checkoutData.deliveryType)
      if (normalizeDeliveryZip(checkoutData.eventZip) !== deliveryQuoteZip) {
        setQuoteError('Your delivery address changed. Refresh your total and review it before paying.')
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
          // The server recomputes every amount below and refuses the order if they differ.
          subtotal: quote.adjustedSubtotal,
          rentalDays: quote.rentalDays,
          durationLabel: quote.durationLabel,
          durationFee: quote.durationFee,
          specialRequestFee: quote.specialRequestFee,
          specialRequestNames: quote.specialRequestNames,
          deliveryFee: quote.deliveryFee,
          taxRate: quote.taxRate,
          taxAmount: quote.taxAmount,
          couponCode: quote.couponCode,
          couponDiscount: quote.couponDiscount,
          damageWaiver: quote.damageWaiver,
          damageWaiverFee: quote.damageWaiverFee,
          totalAmount: quote.grandTotal,
          depositAmount: paymentPrincipal,
          pickupTimeSlot,
          tipAmount,
          lastMinuteFeeAmount: quote.lastMinuteFee,
          schedulingDetails: schedulingForServer,
        }),
      })

      const orderData = await orderRes.json()
      if (orderData.requiresAssistance) {
        router.push('/checkout/assistance')
        return
      }
      if (!orderRes.ok) {
        if (orderRes.status === 409) setQuoteError(orderData.error || 'Your total changed. Please refresh it before paying.')
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
      if (!paymentRes.ok || !paymentData.clientSecret) throw new Error(paymentData.error || 'Payment failed')
      setClientSecret(paymentData.clientSecret)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  const showCouponNotice = !!requestedCoupon && !!quote && quote.couponDiscount === 0
  const phoneHref = 'tel:' + BUSINESS.phone

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-dark mb-3">Payment</h1>
      <p className="text-sm text-body mb-8">Delivery only, in {BUSINESS.serviceArea}. Warehouse pickup is not available. Our crew will collect your rentals from your event afterward.</p>
      <div className="bg-gray-50 p-6 rounded-lg mb-8 space-y-3">
        <div className="flex justify-between text-body"><span>Subtotal</span><span>{quote ? formatCurrency(quote.cartSubtotal) : pendingTotalLabel}</span></div>
        {quote && quote.durationFee > 0 && <div className="flex justify-between text-body text-sm"><span>Multi-Day Rental Fee{quote.durationLabel ? ' (' + quote.durationLabel + ')' : ''}</span><span>{formatCurrency(quote.durationFee)}</span></div>}
        {quote?.specialRequests.map((fee) => <div key={fee.id} className="flex justify-between text-body text-sm"><span>{fee.name}</span><span>{formatCurrency(fee.amount)}</span></div>)}
        {quote && quote.exactDeliveryFee > 0 && <div className="flex justify-between text-body text-sm"><span>Exact-Time Delivery Fee</span><span>{formatCurrency(quote.exactDeliveryFee)}</span></div>}
        {quote && quote.exactPickupFee > 0 && <div className="flex justify-between text-body text-sm"><span>Exact-Time Event Collection Fee</span><span>{formatCurrency(quote.exactPickupFee)}</span></div>}
        {quote && quote.lastMinuteFee > 0 && <div className="flex justify-between text-body text-sm"><span>Last-Minute Booking Fee</span><span>{formatCurrency(quote.lastMinuteFee)}</span></div>}
        {quote && quote.couponDiscount > 0 && <div className="flex justify-between text-green-600 text-sm"><span>Coupon Discount ({quote.couponCode})</span><span>-{formatCurrency(quote.couponDiscount)}</span></div>}
        {showCouponNotice && <p className="text-red-500 text-xs">Coupon code {requestedCoupon} could not be applied to this order.</p>}
        {quote && quote.damageWaiverFee > 0 && <div className="flex justify-between text-body text-sm"><span>Damage Waiver{quote.damageWaiverPercent !== null ? ' (' + formatTaxRatePercent(quote.damageWaiverPercent) + ')' : ''}</span><span>{formatCurrency(quote.damageWaiverFee)}</span></div>}
        <div className="flex justify-between text-body text-sm" aria-live="polite">
          <span>Delivery Fee{deliveryQuoteZip ? ' (ZIP ' + deliveryQuoteZip + ')' : ''}</span>
          <span>{quote ? formatCurrency(quote.deliveryFee) : pendingTotalLabel}</span>
        </div>
        {quoteError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p>{quoteError}</p>
          {quoteCode === 'tax_address_review' || quoteCode === 'tax_not_configured' || quoteCode === 'last_minute_not_offered' || quoteCode === 'checkout_policy_not_configured'
            ? <a href={phoneHref} className="mt-2 inline-block underline font-medium">Call {BUSINESS.phone}</a>
            : <button type="button" disabled={loading || quoteLoading} onClick={() => setQuoteAttempt((attempt) => attempt + 1)} className="mt-2 underline font-medium">Retry pricing</button>}
          <button type="button" onClick={() => router.push('/checkout')} className="ml-4 mt-2 underline">Back to checkout</button>
        </div>}
        <div className="flex justify-between text-body text-sm"><span>Sales Tax{quote ? ' (' + formatTaxRatePercent(quote.taxRate) + ', ' + quote.taxJurisdiction.name + ')' : ''}</span><span>{totalsReady && quote ? formatCurrency(quote.taxAmount) : pendingTotalLabel}</span></div>
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
              <button type="button" onClick={() => applyTipPercent(0.1)} className="px-3 py-1 rounded border border-gray-300 text-sm text-body">10%</button>
              <button type="button" onClick={() => applyTipPercent(0.15)} className="px-3 py-1 rounded border border-gray-300 text-sm text-body">15%</button>
              <button type="button" onClick={() => applyTipPercent(0.2)} className="px-3 py-1 rounded border border-gray-300 text-sm text-body">20%</button>
              <input type="number" min="0" step="0.01" placeholder="Custom $" value={customTip} onChange={applyCustomTip} className="w-24 border rounded px-2 py-1 text-sm" />
            </div>
            <div className="flex justify-between text-body text-sm"><span>Tip</span><span>{formatCurrency(tipAmount)}</span></div>
          </div>
        </fieldset>
        <div className="flex justify-between font-bold text-dark text-lg border-t pt-3"><span>Due Today</span><span className="text-secondary">{totalsReady ? formatCurrency(amountDueToday) : pendingTotalLabel}</span></div>
        <div className="flex justify-between text-body text-sm"><span>Balance due before delivery</span><span>{totalsReady ? formatCurrency(balanceDue) : pendingTotalLabel}</span></div>
      </div>

      {!clientSecret && <>
        <PaymentCardAuthorization checked={saveCard} onChange={setSaveCard} required={false} compact />
        {checkoutAvailable === false && <div role="alert" className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm text-amber-900">Online payment is temporarily unavailable. Please call {BUSINESS.name} at <a href={phoneHref} className="underline">{BUSINESS.phone}</a> to complete your booking. No card has been charged.</div>}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-body"><p>Payment is processed securely through Stripe.</p></div>
        <button onClick={handleContinue} disabled={loading || !totalsReady || checkoutAvailable !== true || needsLastMinuteAcceptance || (paymentChoice === 'custom' && parsedCustomPayAmount < depositAmount)} className="btn-primary w-full text-lg py-3">
          {loading ? 'Processing...' : !totalsReady ? quoteError ? 'Resolve pricing to continue' : 'Calculating your total...' : `Pay ${formatCurrency(amountDueToday)}`}
        </button>
      </>}
      {clientSecret && orderNumber && orderId && <Elements stripe={getStripe()} options={{ clientSecret }}><CardPaymentForm amount={amountDueToday} onSuccess={(paymentId) => confirmPayment(orderNumber, orderId, paymentId)} /></Elements>}
      {quote && needsLastMinuteAcceptance && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-lg font-bold text-dark mb-3">Last-Minute Booking Fee</h2>
        <p className="text-sm text-body mb-4">Your event is within 72 hours. A {formatCurrency(quote.lastMinuteFee)} last-minute booking fee applies and has been added to your total below.</p>
        <button type="button" onClick={() => setLastMinuteFeeAccepted(true)} className="btn-primary w-full py-3">I Understand, Add the Fee and Continue</button>
      </div></div>}
    </div>
  )
}
