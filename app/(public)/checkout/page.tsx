'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useCart } from '@/components/public/CartContext'
import { formatCurrency } from '@/lib/utils'
import { trackEvent } from '@/lib/gtag'

interface CheckoutForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  eventAddress: string
  eventCity: string
  eventState: string
  eventZip: string
  deliveryType: string
  couponCode: string
  damageWaiver: boolean
  durationTierId: string
  specialRequests: string[]
  tentSurfaceType: string
  tentSurfaceArea: string
  notes: string
}

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

export default function CheckoutPage() {
  const router = useRouter()
  const { items, subtotal, eventDate, eventTimeSlot, pickupTimeSlot, deliveryType: cartDeliveryType, exactTimeRequested, loaded } = useCart()
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CheckoutForm>()
  const [loading, setLoading] = useState(false)
  const [sendingQuote, setSendingQuote] = useState(false)
  const [tiers, setTiers] = useState<PricingTier[]>([])
  const [fees, setFees] = useState<SpecialRequestFee[]>([])

  useEffect(() => {
    fetch('/api/pricing-tiers')
      .then((r) => r.json())
      .then((data) => setTiers(data.tiers || []))
      .catch(() => setTiers([]))

    fetch('/api/special-request-fees')
      .then((r) => r.json())
      .then((data) => setFees(data.fees || []))
      .catch(() => setFees([]))
  }, [])

  useEffect(() => {
    if (loaded && cartDeliveryType) {
      setValue('deliveryType', cartDeliveryType)
    }
  }, [loaded, cartDeliveryType, setValue])

  const selectedTierId = watch('durationTierId')
  const selectedTier = tiers.find((t) => t.id === selectedTierId) || tiers[0]
  const isSingleDay = !selectedTier || (selectedTier.minDays <= 1 && (selectedTier.maxDays ?? 1) <= 1)
  const hasTablesTentsItem = items.some((i) => i.pricingProfile === 'tables_tents')
  const hasTentItem = items.some((i) => i.pricingProfile === 'tables_tents' && /tent/i.test(i.name))
  const hasBounceItem = items.some((i) => i.pricingProfile === 'bounce_waterslide')
  const exactTimeFee = fees.find((fee) => fee.name.toLowerCase().includes('exact'))
  const visibleFees = fees.filter((fee) => {
    if (fee.name.toLowerCase().includes('exact')) return false
    return fee.name.toLowerCase().includes('overnight') ? hasBounceItem : hasTablesTentsItem
  })
  const durationAmount = selectedTier ? Math.round(subtotal * (selectedTier.percent / 100) * 100) / 100 : 0

  if (!items.length || !eventDate) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-body mb-4">Your cart is empty or no event date selected.</p>
        <a href="/order-by-date" className="btn-primary inline-block">Start Booking</a>
      </div>
    )
  }

  const onSubmit = async (data: CheckoutForm) => {
    setLoading(true)
    try {
      const specialRequests = Array.isArray(data.specialRequests)
        ? [...data.specialRequests]
        : (data.specialRequests ? [data.specialRequests] : [])
      if (exactTimeRequested && exactTimeFee && !specialRequests.includes(exactTimeFee.id)) {
        specialRequests.push(exactTimeFee.id)
      }
      const finalData = { ...data, specialRequests }
      sessionStorage.setItem('checkout_data', JSON.stringify(finalData))
      trackEvent('begin_checkout', {
        value: subtotal,
        currency: 'USD',
        items: items.map((item) => ({ item_name: item.name, quantity: item.quantity, price: item.price })),
      })
      trackEvent('ads_conversion_Begin_checkout_1', { value: subtotal, currency: 'USD' })
      router.push('/checkout/payment')
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleSendQuote = async () => {
    const email = watch('email')
    if (!email) {
      toast.error('Please enter your email address above first')
      return
    }
    setSendingQuote(true)
    try {
      const firstName = watch('firstName')
      const lastName = watch('lastName')
      const res = await fetch('/api/send-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          customerName: `${firstName || ''} ${lastName || ''}`.trim(),
          eventDate,
          eventTimeSlot,
          pickupTimeSlot,
          deliveryType: cartDeliveryType,
          items,
          subtotal,
        }),
      })
      if (res.ok) {
        toast.success('Quote sent! Check your email.')
      } else {
        toast.error('Could not send quote. Please try again.')
      }
    } catch {
      toast.error('Could not send quote. Please try again.')
    } finally {
      setSendingQuote(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-dark mb-8">Checkout</h1>

      <div className="bg-gray-50 p-4 rounded-lg mb-8">
        <h2 className="font-bold text-dark mb-2">Order Summary</h2>
        <p className="text-body text-sm mb-2">Event Date: {eventDate}</p>
        {eventTimeSlot && (
          <p className="text-body text-sm mb-2">Time: {eventTimeSlot}</p>
        )}
        {pickupTimeSlot && pickupTimeSlot !== eventTimeSlot && (
          <p className="text-body text-sm mb-2">Pickup/Return: {pickupTimeSlot}</p>
        )}
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm text-body py-1">
            <span>{item.name} x{item.quantity}</span>
            <span>{formatCurrency(item.price * item.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between text-dark mt-2 border-t pt-2">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {durationAmount > 0 && (
          <div className="flex justify-between text-body text-sm">
            <span>Multi-Day Rental Fee ({selectedTier?.label})</span>
            <span>{formatCurrency(durationAmount)}</span>
          </div>
        )}
        {exactTimeRequested && exactTimeFee && (
          <div className="flex justify-between text-body text-sm">
            <span>{exactTimeFee.name} Delivery Fee</span>
            <span>{formatCurrency(exactTimeFee.amount)}</span>
          </div>
        )}
        <p className="text-xs text-gray-500 mt-2">{watch('deliveryType') === 'pickup' ? 'Sales tax is calculated on the next step. No delivery fee applies to customer pickup orders.' : 'Delivery fee and sales tax are calculated on the next step based on your address.'}</p>
      </div>

      {exactTimeRequested && exactTimeFee && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-body mb-4">
          A {formatCurrency(exactTimeFee.amount)} Exact Time Delivery fee will be added to your total because you requested a guaranteed drop-off and pick-up time.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark mb-1">First Name *</label>
            <input {...register('firstName', { required: true })} className="w-full border rounded px-3 py-2" />
            {errors.firstName && <span className="text-red-500 text-xs">Required</span>}
          </div>
          <div>
            <label className="block text-sm font-medium text-dark mb-1">Last Name *</label>
            <input {...register('lastName', { required: true })} className="w-full border rounded px-3 py-2" />
            {errors.lastName && <span className="text-red-500 text-xs">Required</span>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-dark mb-1">Email *</label>
          <input type="email" {...register('email', { required: true })} className="w-full border rounded px-3 py-2" />
          {errors.email && <span className="text-red-500 text-xs">Required</span>}
        </div>
        <div>
          <label className="block text-sm font-medium text-dark mb-1">Phone</label>
          <input type="tel" {...register('phone')} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-dark mb-1">Event Address {watch('deliveryType') !== 'pickup' ? '*' : '(optional for pickup)'}</label>
          <input {...register('eventAddress', { required: watch('deliveryType') !== 'pickup' })} className="w-full border rounded px-3 py-2" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark mb-1">City {watch('deliveryType') !== 'pickup' ? '*' : ''}</label>
            <input {...register('eventCity', { required: watch('deliveryType') !== 'pickup' })} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark mb-1">State {watch('deliveryType') !== 'pickup' ? '*' : ''}</label>
            <input {...register('eventState', { required: watch('deliveryType') !== 'pickup' })} defaultValue="NY" className="w-full border rounded px-3 py-2" /></div>
          <div>
            <label className="block text-sm font-medium text-dark mb-1">Zip {watch('deliveryType') !== 'pickup' ? '*' : ''}</label>
            <input {...register('eventZip', { required: watch('deliveryType') !== 'pickup' })} className="w-full border rounded px-3 py-2" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-dark mb-1">Delivery or Pickup</label>
          <select {...register('deliveryType')} className="w-full border rounded px-3 py-2">
            <option value="delivery">Delivery</option>
            <option value="pickup">Customer Pickup</option>
          </select>
        </div>
        {tiers.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-dark mb-1">Rental Length</label>
            <select {...register('durationTierId')} className="w-full border rounded px-3 py-2">
              {tiers.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {tier.label}{tier.percent > 0 ? ` (+${tier.percent}%)` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
        {(hasTablesTentsItem || hasBounceItem) && (
          <div className="bg-gray-50 p-3 rounded space-y-3">
            {hasTentItem && (
              <>
                <p className="text-sm font-medium text-dark">Tent Setup Details</p>
                <div>
                  <label className="block text-sm font-medium text-dark mb-1">Surface Type</label>
                  <select {...register('tentSurfaceType')} className="w-full border rounded px-3 py-2">
                    <option value="">Select surface type</option>
                    <option value="grass">Grass</option>
                    <option value="concrete">Concrete / Pavement</option>
                    <option value="gravel">Gravel</option>
                    <option value="deck">Deck / Patio</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark mb-1">Tent Setup Area / Dimensions</label>
                  <input {...register('tentSurfaceArea')} placeholder="e.g. 20ft x 20ft" className="w-full border rounded px-3 py-2" />
                </div>
              </>
            )}
            {visibleFees.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-sm font-medium text-dark">Suggested Add-Ons</p>
                {visibleFees.map((fee) => (
                  <div key={fee.id} className="flex items-start gap-2">
                    <input type="checkbox" id={`fee-${fee.id}`} value={fee.id} {...register('specialRequests')} className="mt-1" />
                    <label htmlFor={`fee-${fee.id}`} className="text-sm text-body">
                      {fee.name} (+{formatCurrency(fee.amount)})
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-dark mb-1">Coupon Code</label>
          <input {...register('couponCode')} placeholder="Optional" className="w-full border rounded px-3 py-2" />
        </div>
        <div className="flex items-start gap-2 bg-gray-50 p-3 rounded">
          <input type="checkbox" id="damageWaiver" {...register('damageWaiver')} className="mt-1" />
          <label htmlFor="damageWaiver" className="text-sm text-body">
            <span className="font-medium text-dark">Add Damage Waiver (10% of subtotal)</span> - covers accidental damage to rental equipment during your event, excluding intentional damage or theft.
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-dark mb-1">Notes</label>
          <textarea {...register('notes')} rows={3} className="w-full border rounded px-3 py-2" />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Processing...' : 'Continue to Payment'}
        </button>
        <button type="button" onClick={handleSendQuote} disabled={sendingQuote} className="w-full border border-blue-600 text-blue-600 rounded py-2 font-medium hover:bg-blue-50">
          {sendingQuote ? 'Sending...' : 'Email Me This Quote'}
        </button>
      </form>
    </div>
  )
}
