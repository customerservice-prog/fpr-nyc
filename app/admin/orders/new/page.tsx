'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { findPoleTentSurfaceIssue, findFrameTentSurfaceIssue } from '@/lib/tentSurfaceRules'

interface CatalogItem {
  id: string
  name: string
  cost: number
  picture?: string | null
  category?: { name: string; picture?: string | null } | null
}

interface LineItem {
  itemId: string
  itemName: string
  quantity: string
  unitPrice: string
}

interface CustomerResult {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
}

function generateExactTimeOptions() {
  const opts: { value: string; label: string }[] = []
  for (let h = 6; h <= 22; h++) {
    for (const m of [0, 30]) {
      if (h === 22 && m === 30) continue
      const hour12 = h % 12 === 0 ? 12 : h % 12
      const ampm = h < 12 ? 'AM' : 'PM'
      const mm = m === 0 ? '00' : '30'
      opts.push({ value: `exact_${String(h).padStart(2, '0')}${mm}`, label: `Exact Time: ${hour12}:${mm} ${ampm}` })
    }
  }
  return opts
}

const EXACT_TIME_OPTIONS = generateExactTimeOptions()

const DROPOFF_SLOTS = [
  { value: 'morning', label: 'Morning (8am - 12pm)' },
  { value: 'afternoon', label: 'Afternoon (12pm - 4pm)' },
  { value: 'evening', label: 'Evening (4pm - 7pm)' },
  { value: 'overnight', label: 'Overnight Rental (picked up the next day)' },
  ...EXACT_TIME_OPTIONS,
]

const PICKUP_SLOTS = [
  { value: 'same_evening', label: 'Same Day Evening Pickup' },
  { value: 'next_morning', label: 'Next Day Morning Pickup' },
  { value: 'next_afternoon', label: 'Next Day Afternoon Pickup' },
  ...EXACT_TIME_OPTIONS,
]

const STATUS_OPTIONS = [
  { value: 'quote', label: 'Quote' },
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
]

const LOCAL_CITIES = ["Greenville","Anderson","Belton","Berea","Boiling Springs","Central","Clemson","Duncan","Easley","Fountain Inn","Gantt","Gray Court","Greer","Honea Path","Inman","Judson","Landrum","Laurens","Liberty","Marietta","Mauldin","Parker","Pelzer","Pickens","Piedmont","Powdersville","Seneca","Simpsonville","Six Mile","Spartanburg","Taylors","Travelers Rest","Wade Hampton","Williamston","Woodruff"]

type Step = 'cart' | 'customer'

function NewOrderPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<'choose' | 'cart'>('choose')
  const [step, setStep] = useState<Step>('cart')
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    secondaryPhone: '',
    billingAddress: '',
    billingCity: '',
    billingCityOther: '',
    billingState: 'SC',
    billingZip: '',
    eventDate: '',
    dropoffSlot: '',
    eventEndDate: '',
    pickupSlot: '',
    eventAddress: '',
    eventCity: '',
    eventCityOther: '',
    eventState: 'SC',
    eventZip: '',
    deliveryType: 'delivery',
    travelFee: '0',
      deliveryDistance: null as number | null,
    notes: '',
    internalNotes: '',
    setupSurface: '',
    isPublicPark: false,
    referenceSource: '',
    status: 'quote',
  })
  const [sameAsBilling, setSameAsBilling] = useState(true)
  const [customerId, setCustomerId] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<CustomerResult[]>([])
  const [searchingCustomers, setSearchingCustomers] = useState(false)
  const [showCustomerResults, setShowCustomerResults] = useState(false)

  const [items, setItems] = useState<LineItem[]>([])
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [setupSurfaces, setSetupSurfaces] = useState<{ id: string; name: string }[]>([])
  const [references, setReferences] = useState<{ id: string; name: string }[]>([])
  const [itemSearch, setItemSearch] = useState('')
  const [openCategory, setOpenCategory] = useState<string | null>(null)

  const [taxRate, setTaxRate] = useState(0)
  const [depositRule, setDepositRule] = useState<{ type: string; amount: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [couponCode, setCouponCode] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponMessage, setCouponMessage] = useState('')
  const [applyingCoupon, setApplyingCoupon] = useState(false)

  const [calculatingFee, setCalculatingFee] = useState(false)

  const [agreeDeposit, setAgreeDeposit] = useState(false)
  const [agreeElectricity, setAgreeElectricity] = useState(false)
  const [fees, setFees] = useState<{ id: string; name: string; amount: number }[]>([])

  useEffect(() => {
    const d = searchParams?.get('date')
    if (d) {
      setForm((prev) => ({ ...prev, eventDate: prev.eventDate || d }))
    }
  }, [searchParams])

  useEffect(() => {
    fetch('/api/items')
      .then((r) => r.json())
      .then((d) => setCatalog((d.items || d).filter((i: any) => i.displayToCustomer)))
      .catch(() => {})
    fetch('/api/tax-rate')
      .then((r) => r.json())
      .then((d) => setTaxRate(d.rate?.isActive ? d.rate.rate : 0))
      .catch(() => {})
    fetch('/api/deposit-rule')
      .then((r) => r.json())
      .then((d) => setDepositRule(d.rule?.isActive ? d.rule : null))
      .catch(() => {})
    fetch('/api/admin/setup-surfaces')
      .then((r) => r.json())
      .then((d) => setSetupSurfaces((d.surfaces || []).filter((s: any) => s.isActive)))
      .catch(() => {})
    fetch('/api/admin/references')
      .then((r) => r.json())
      .then((d) => setReferences((d.references || []).filter((r: any) => r.isActive)))
      .catch(() => {})
    fetch('/api/special-request-fees')
      .then((r) => r.json())
      .then((d) => setFees(d.fees || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!customerSearch.trim()) {
      setCustomerResults([])
      return
    }
    setSearchingCustomers(true)
    const t = setTimeout(() => {
      fetch(`/api/admin/customers?search=${encodeURIComponent(customerSearch)}&pageSize=8`)
        .then((r) => r.json())
        .then((d) => setCustomerResults(d.customers || []))
        .catch(() => {})
        .finally(() => setSearchingCustomers(false))
    }, 350)
    return () => clearTimeout(t)
  }, [customerSearch])

  const categorized = catalog.reduce((acc: Record<string, CatalogItem[]>, item) => {
    const cat = item.category?.name || 'Other'
    acc[cat] = acc[cat] || []
    acc[cat].push(item)
    return acc
  }, {})

  const filteredCategories = Object.entries(categorized)
    .map(([cat, catItems]) => [
      cat,
      itemSearch.trim()
        ? catItems.filter((c) => c.name.toLowerCase().includes(itemSearch.toLowerCase()))
        : catItems,
    ] as [string, CatalogItem[]])
    .filter(([, catItems]) => catItems.length > 0)

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (customerId && (field === 'firstName' || field === 'lastName' || field === 'email')) {
      setCustomerId('')
    }
  }

  const selectCustomer = (c: CustomerResult) => {
    setForm((prev) => ({
      ...prev,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone || '',
      billingAddress: c.address || '',
      billingCity: c.city || '',
      billingState: c.state || 'SC',
      billingZip: c.zip || '',
    }))
    setCustomerId(c.id)
    setCustomerSearch(`${c.firstName} ${c.lastName}`)
    setShowCustomerResults(false)
  }

  const addItemToCart = (catItem: CatalogItem) => {
    if (!form.eventDate) {
      toast.error('Please choose an event date first')
      return
    }
    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.itemId === catItem.id)
      if (existingIdx >= 0) {
        const next = [...prev]
        next[existingIdx] = { ...next[existingIdx], quantity: String((parseInt(next[existingIdx].quantity) || 0) + 1) }
        return next
      }
      return [...prev, { itemId: catItem.id, itemName: catItem.name, quantity: '1', unitPrice: String(catItem.cost) }]
    })
  }

  const updateItem = (idx: number, field: keyof LineItem, value: string) => {
    setItems((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }

  const removeRow = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx))

  const hasBounceHouse = items.some((i) => {
    const cat = catalog.find((c) => c.id === i.itemId)?.category?.name || ''
    const name = i.itemName || ''
    return /bounce|inflatable|waterslide|slide/i.test(cat) || /bounce|inflatable|waterslide|slide/i.test(name)
  })

  const resolvedBillingCity = form.billingCity === 'Other' ? form.billingCityOther : form.billingCity
  const resolvedEventCity = form.eventCity === 'Other' ? form.eventCityOther : form.eventCity
  const effectiveEventAddress = sameAsBilling ? form.billingAddress : form.eventAddress
  const effectiveEventCity = sameAsBilling ? resolvedBillingCity : resolvedEventCity
  const effectiveEventState = sameAsBilling ? form.billingState : form.eventState
  const effectiveEventZip = sameAsBilling ? form.billingZip : form.eventZip

  const calculateTravelFee = async () => {
    if (!effectiveEventZip) {
      toast.error('Enter an event zip code first')
      return
    }
    setCalculatingFee(true)
    try {
      const res = await fetch(`/api/delivery-fee?zip=${encodeURIComponent(effectiveEventZip)}`)
      const d = await res.json()
      if (res.ok && typeof d.fee === 'number') {
                setForm((prev) => ({ ...prev, travelFee: String(d.fee), deliveryDistance: typeof d.distance === 'number' ? d.distance : prev.deliveryDistance }))
        toast.success(`Travel fee set to $${d.fee.toFixed(2)} (${d.distance} mi)`)
      } else {
        toast.error(d.error || 'Could not calculate travel fee for this zip')
      }
    } catch {
      toast.error('Could not calculate travel fee')
    } finally {
      setCalculatingFee(false)
    }
  }

  useEffect(() => { if (form.deliveryType !== 'delivery') return; if (!effectiveEventZip || effectiveEventZip.trim().length < 5) return; const travelFeeTimer = setTimeout(() => { calculateTravelFee() }, 500); return () => clearTimeout(travelFeeTimer) }, [effectiveEventZip, form.deliveryType]); const applyCoupon = async () => {
    if (!couponCode.trim()) return
    setApplyingCoupon(true)
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, subtotal }),
      })
      const d = await res.json()
      if (d.valid) {
        setCouponDiscount(d.discount || 0)
        setCouponMessage(d.message || 'Coupon applied')
        toast.success(d.message || 'Coupon applied')
      } else {
        setCouponDiscount(0)
        setCouponMessage(d.message || 'Invalid coupon')
        toast.error(d.message || 'Invalid coupon')
      }
    } catch {
      toast.error('Could not validate coupon')
    } finally {
      setApplyingCoupon(false)
    }
  }

  const subtotal = items.reduce((sum, i) => sum + (parseFloat(i.unitPrice) || 0) * (parseInt(i.quantity) || 0), 0)
  const travelFeeAmount = parseFloat(form.travelFee) || 0
  const exactTimeFee = fees.find((f) => f.name.toLowerCase().includes('exact'))
  const isExactTimeRequested = form.dropoffSlot.startsWith('exact_') || form.pickupSlot.startsWith('exact_')
  const exactTimeFeeAmount = isExactTimeRequested && exactTimeFee ? exactTimeFee.amount : 0
  const taxableBase = subtotal + travelFeeAmount + exactTimeFeeAmount - couponDiscount
  const taxAmount = taxableBase * (taxRate / 100)
  const totalAmount = taxableBase + taxAmount
  const depositAmount = depositRule
    ? depositRule.type === 'percentage'
      ? totalAmount * (depositRule.amount / 100)
      : depositRule.amount
    : 0

  const eventTimeSlot = DROPOFF_SLOTS.find((s) => s.value === form.dropoffSlot)?.label || ''
  const pickupTimeSlotLabel = PICKUP_SLOTS.find((s) => s.value === form.pickupSlot)?.label || ''

  const goToCustomerInfo = () => {
    if (items.length === 0) {
      toast.error('Add at least one item to the cart first')
      return
    }
    if (!form.eventDate) {
      toast.error('Select an event date first')
      return
    }
    setStep('customer')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) {
      toast.error('Add at least one item to the order')
      return
    }
    if (!agreeDeposit) {
      toast.error('The non-refundable deposit policy must be acknowledged')
      return
    }
    if (hasBounceHouse && !agreeElectricity) {
      toast.error('The electrical requirement for inflatable equipment must be acknowledged')
      return
    }
    const poleIssue = findPoleTentSurfaceIssue(items, form.setupSurface); const frameIssue = findFrameTentSurfaceIssue(items, form.setupSurface); if (frameIssue && !window.confirm(frameIssue + ' Create order anyway?')) { return }
    if (poleIssue && !window.confirm(poleIssue + '\n\nCreate order anyway?')) {
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerId || undefined,
          customer: {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone,
            company: form.company || undefined,
            secondaryPhone: form.secondaryPhone || undefined,
            address: form.billingAddress,
            city: resolvedBillingCity,
            state: form.billingState,
            zip: form.billingZip,
          },
          status: form.status,
          eventDate: form.eventDate,
          eventEndDate: form.eventEndDate || undefined,
          eventTimeSlot: eventTimeSlot || undefined,
          pickupTimeSlot: pickupTimeSlotLabel || undefined,
          eventAddress: effectiveEventAddress,
          eventCity: effectiveEventCity,
          eventState: effectiveEventState,
          eventZip: effectiveEventZip,
          deliveryType: form.deliveryType,
          deliveryFee: travelFeeAmount,
                    totalAmount,
          taxRate,
          subtotal: subtotal + exactTimeFeeAmount,
          taxAmount,
                              deliveryDistance: form.deliveryDistance ?? undefined,
          depositAmount,
          amountPaid: 0,
          balanceDue: totalAmount,
          notes: form.notes,
          internalNotes: form.internalNotes,
          setupSurface: form.setupSurface || undefined,
          isPublicPark: form.isPublicPark,
          referenceSource: form.referenceSource || undefined,
          couponCode: couponDiscount > 0 ? couponCode : undefined,
          couponDiscount: couponDiscount || undefined,
          items: [
            ...items.map((i) => ({
              itemId: i.itemId || undefined,
              itemName: i.itemName,
              quantity: parseInt(i.quantity),
              unitPrice: parseFloat(i.unitPrice),
            })),
            ...(exactTimeFeeAmount > 0 ? [{ itemName: (exactTimeFee ? exactTimeFee.name : "Exact Time") + " Fee", quantity: 1, unitPrice: exactTimeFeeAmount }] : []),
          ],
        }),
      })
      if (res.ok) {
        const d = await res.json()
        toast.success('Quote created — continue to Payment Options')
        router.push(`/admin/orders/${d.order.id}/checkout`)
      } else {
        toast.error('Failed to create order')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const stepNum = step === 'cart' ? 1 : 2

  return (
    <div className="p-4 max-w-3xl">
      <h1 className="text-xl font-bold text-dark mb-4">Create New Order / Quote</h1>

      {mode === 'choose' && (
        <div className="bg-white rounded shadow p-6">
          <h2 className="font-bold text-dark mb-4">How would you like to create this order?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setMode('cart')}
              className="border rounded-lg p-6 text-left hover:shadow hover:border-secondary transition"
            >
              <div className="font-bold text-dark mb-2">Create using Shopping Cart Interface</div>
              <div className="text-sm text-body">Browse rental categories with pictures, add items to a cart, then enter customer info and payment.</div>
            </button>
            <button
              type="button"
              onClick={() => {
                const d = searchParams?.get('date')
                router.push(`/admin/orders/new/single-page${d ? `?date=${d}` : ''}`)
              }}
              className="border rounded-lg p-6 text-left hover:shadow hover:border-secondary transition"
            >
              <div className="font-bold text-dark mb-2">Create using Single Page Checkout</div>
              <div className="text-sm text-body">Enter event details, items, customer info, and payment all on one compact page.</div>
            </button>
          </div>
        </div>
      )}

      {mode === 'cart' && (
      <>
      <div className="flex items-center gap-6 mb-6 bg-white rounded shadow p-4">
        <div className="flex items-center gap-2">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${stepNum === 1 ? 'bg-secondary' : 'bg-gray-400'}`}>1</span>
          <span className={stepNum === 1 ? 'font-bold text-dark' : 'text-body'}>Cart</span>
        </div>
        <div className="flex-1 border-t"></div>
        <div className="flex items-center gap-2">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${stepNum === 2 ? 'bg-secondary' : 'bg-gray-400'}`}>2</span>
          <span className={stepNum === 2 ? 'font-bold text-dark' : 'text-body'}>Customer Info</span>
        </div>
        <div className="flex-1 border-t"></div>
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white bg-gray-400">3</span>
          <span className="text-body">Payment Options</span>
        </div>
      </div>

      {step === 'cart' && (
        <div className="bg-white rounded shadow p-6 space-y-4">
          <div>
            <h2 className="font-bold text-dark mb-3">Event Date & Time</h2>
            <div className="grid grid-cols-2 gap-4 mb-2">
              <div>
                <label className="block text-xs text-body mb-1">Start Date</label>
                <input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} className="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label className="block text-xs text-body mb-1">Drop-Off Time</label>
                <select value={form.dropoffSlot} onChange={(e) => setForm({ ...form, dropoffSlot: e.target.value })} className="w-full border rounded px-3 py-2">
                  <option value="">Select a time window...</option>
                  {DROPOFF_SLOTS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-body mb-1">End Date</label>
                <input type="date" value={form.eventEndDate} onChange={(e) => setForm({ ...form, eventEndDate: e.target.value })} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs text-body mb-1">Pickup Time</label>
                <select value={form.pickupSlot} onChange={(e) => setForm({ ...form, pickupSlot: e.target.value })} className="w-full border rounded px-3 py-2">
                  <option value="">Select a time window...</option>
                  {PICKUP_SLOTS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {isExactTimeRequested && exactTimeFee && (
              <p className="text-xs text-secondary mt-2">A guaranteed exact time fee of ${exactTimeFee.amount} will be added to the total because an Exact Time slot was selected.</p>
            )}
          </div>

          <div className="border-t pt-4">
            <h2 className="font-bold text-dark mb-3">Items</h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
              {Object.entries(categorized).map(([cat, catItems]) => {
                const tilePic = catItems.find((c) => c.category?.picture)?.category?.picture || catItems.find((c) => c.picture)?.picture || null
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => { setOpenCategory(cat); setItemSearch('') }}
                    className={`border rounded-lg overflow-hidden text-left hover:shadow transition ${openCategory === cat ? 'ring-2 ring-secondary' : ''}`}
                  >
                    {tilePic ? (
                      <img src={tilePic} alt={cat} className="w-full h-20 object-cover" />
                    ) : (
                      <div className="w-full h-20 bg-gray-100 flex items-center justify-center text-xs text-body">No image</div>
                    )}
                    <div className="px-2 py-1">
                      <div className="text-xs font-semibold text-dark truncate">{cat}</div>
                      <div className="text-[10px] text-body">{catItems.length} items</div>
                    </div>
                  </button>
                )
              })}
            </div>

            <input
              placeholder="Search items..."
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-3 text-sm"
            />
            <div className="border rounded max-h-96 overflow-y-auto mb-4">
              {filteredCategories.map(([cat, catItems]) => (
                <div key={cat} className="border-b last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setOpenCategory(openCategory === cat ? null : cat)}
                    className="w-full flex justify-between items-center px-3 py-2 bg-gray-50 text-sm font-semibold text-dark"
                  >
                    <span>{cat} ({catItems.length})</span>
                    <span>{openCategory === cat || itemSearch.trim() ? '−' : '+'}</span>
                  </button>
                  {(openCategory === cat || itemSearch.trim()) && (
                    <div>
                      {catItems.map((c) => (
                        <div key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm border-t">
                          {c.picture ? (
                            <img src={c.picture} alt={c.name} className="w-14 h-14 object-cover rounded" />
                          ) : (
                            <div className="w-14 h-14 rounded bg-gray-100 flex items-center justify-center text-[10px] text-body">No img</div>
                          )}
                          <span className="flex-1">{c.name}</span>
                          <span className="text-body">${c.cost}</span>
                          <button type="button" onClick={() => addItemToCart(c)} className="text-secondary font-semibold text-xs border rounded px-2 py-1">Add</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {items.length === 0 && <p className="text-sm text-body mb-2">No items added yet — use the list above to add items to this order.</p>}
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-center">
                <span className="col-span-6 text-sm">{item.itemName}</span>
                <input type="number" min="1" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} className="col-span-2 border rounded px-2 py-2 text-sm" required />
                <input type="number" step="0.01" placeholder="Unit Price" value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)} className="col-span-2 border rounded px-2 py-2 text-sm" required />
                <span className="col-span-1 text-sm text-right">${((parseFloat(item.unitPrice) || 0) * (parseInt(item.quantity) || 0)).toFixed(2)}</span>
                <button type="button" onClick={() => removeRow(idx)} className="col-span-1 text-red-600 text-sm">✕</button>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 rounded p-4 space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            {exactTimeFeeAmount > 0 && (
              <div className="flex justify-between"><span>{exactTimeFee ? exactTimeFee.name : "Exact Time"} Fee</span><span>${exactTimeFeeAmount.toFixed(2)}</span></div>
            )}
            <div className="flex justify-between text-xs text-body"><span>Travel fee, tax, and deposit are calculated on the next step</span></div>
          </div>

          <button type="button" onClick={goToCustomerInfo} className="btn-admin">Continue to Customer Info &gt;&gt;</button>
        </div>
      )}

      {step === 'customer' && (
        <form onSubmit={handleSubmit} className="bg-white rounded shadow p-6 space-y-4">

          <div className="border-b pb-4 relative">
            <h2 className="font-bold text-dark mb-3">Find Customer</h2>
            <input
              placeholder="Search by name, email, or phone..."
              value={customerSearch}
              onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerResults(true); if (customerId) setCustomerId('') }}
              onFocus={() => setShowCustomerResults(true)}
              className="w-full border rounded px-3 py-2"
            />
            {customerId && <p className="text-xs text-secondary mt-1">Existing customer selected</p>}
            {showCustomerResults && customerSearch.trim() && (
              <div className="absolute z-10 bg-white border rounded shadow mt-1 w-full max-h-56 overflow-y-auto">
                {searchingCustomers && <div className="px-3 py-2 text-sm text-body">Searching...</div>}
                {!searchingCustomers && customerResults.length === 0 && (
                  <div className="px-3 py-2 text-sm text-body">No matching customers — fill in details below to create a new one</div>
                )}
                {customerResults.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => selectCustomer(c)}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b last:border-b-0"
                  >
                    <span className="font-semibold">{c.firstName} {c.lastName}</span>
                    <span className="text-body"> — {c.email} — {c.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="font-bold text-dark mb-3">Billing Information</h2>
            <div className="grid grid-cols-2 gap-4 mb-2">
              <input placeholder="First Name" value={form.firstName} onChange={(e) => updateForm('firstName', e.target.value)} className="border rounded px-3 py-2" required />
              <input placeholder="Last Name" value={form.lastName} onChange={(e) => updateForm('lastName', e.target.value)} className="border rounded px-3 py-2" required />
            </div>
            <input type="email" placeholder="Email" value={form.email} onChange={(e) => updateForm('email', e.target.value)} className="w-full border rounded px-3 py-2 mb-2" required />
            <div className="grid grid-cols-2 gap-4 mb-2">
              <input type="tel" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="border rounded px-3 py-2" />
              <input type="tel" placeholder="Secondary Phone (optional)" value={form.secondaryPhone} onChange={(e) => setForm({ ...form, secondaryPhone: e.target.value })} className="border rounded px-3 py-2" />
            </div>
            <input placeholder="Company Name (optional)" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="w-full border rounded px-3 py-2 mb-2" />
            <input placeholder="Billing Address" value={form.billingAddress} onChange={(e) => setForm({ ...form, billingAddress: e.target.value })} className="w-full border rounded px-3 py-2 mb-2" required={form.deliveryType === 'delivery' && sameAsBilling} />
            <div className="grid grid-cols-3 gap-4">
              <select value={form.billingCity} onChange={(e) => setForm({ ...form, billingCity: e.target.value })} className="border rounded px-3 py-2" required={form.deliveryType === 'delivery' && sameAsBilling}>
                <option value="">-- City --</option>
                {LOCAL_CITIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                <option value="Other">Other</option>
              </select>
              <select value={form.billingState} onChange={(e) => setForm({ ...form, billingState: e.target.value })} className="border rounded px-3 py-2">
                <option value="SC">SC</option>
                <option value="Other">Other</option>
              </select>
              <input placeholder="Zip" value={form.billingZip} onChange={(e) => setForm({ ...form, billingZip: e.target.value })} className="border rounded px-3 py-2" required={form.deliveryType === 'delivery' && sameAsBilling} />
            </div>
            {form.billingCity === 'Other' && (
              <input placeholder="Enter City Name" value={form.billingCityOther} onChange={(e) => setForm({ ...form, billingCityOther: e.target.value })} className="w-full border rounded px-3 py-2 mt-2" required={form.deliveryType === 'delivery' && sameAsBilling} />
            )}
          </div>

          <div className="border-t pt-4">
            <h2 className="font-bold text-dark mb-3">Event / Delivery Address</h2>
            <label className="flex items-center gap-2 text-sm mb-2">
              <input type="checkbox" checked={sameAsBilling} onChange={(e) => setSameAsBilling(e.target.checked)} />
              Same as Billing Address
            </label>
            {!sameAsBilling && (
              <>
                <input placeholder="Event Address" value={form.eventAddress} onChange={(e) => setForm({ ...form, eventAddress: e.target.value })} className="w-full border rounded px-3 py-2 mb-2" required={form.deliveryType === 'delivery' && !sameAsBilling} />
                <div className="grid grid-cols-3 gap-4 mb-2">
                  <select value={form.eventCity} onChange={(e) => setForm({ ...form, eventCity: e.target.value })} className="border rounded px-3 py-2" required={form.deliveryType === 'delivery' && !sameAsBilling}>
                    <option value="">-- City --</option>
                    {LOCAL_CITIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                    <option value="Other">Other</option>
                  </select>
                  <select value={form.eventState} onChange={(e) => setForm({ ...form, eventState: e.target.value })} className="border rounded px-3 py-2">
                    <option value="SC">SC</option>
                    <option value="Other">Other</option>
                  </select>
                  <input placeholder="Zip" value={form.eventZip} onChange={(e) => setForm({ ...form, eventZip: e.target.value })} className="border rounded px-3 py-2" required={form.deliveryType === 'delivery' && !sameAsBilling} />
                </div>
                {form.eventCity === 'Other' && (
                  <input placeholder="Enter City Name" value={form.eventCityOther} onChange={(e) => setForm({ ...form, eventCityOther: e.target.value })} className="w-full border rounded px-3 py-2 mb-2" required={form.deliveryType === 'delivery' && !sameAsBilling} />
                )}
              </>
            )}
            <div className="grid grid-cols-2 gap-4 items-end mt-2">
              <select value={form.deliveryType} onChange={(e) => setForm({ ...form, deliveryType: e.target.value, travelFee: e.target.value === 'pickup' ? '0' : form.travelFee })} className="w-full border rounded px-3 py-2">
                <option value="delivery">Delivery</option>
                <option value="pickup">Customer Pickup</option>
              </select>
              <div>
                <label className="block text-xs text-body mb-1">Travel Fee</label>
                <div className="flex gap-2">
                  <input type="number" step="0.01" placeholder="Travel Fee" value={form.travelFee} onChange={(e) => setForm({ ...form, travelFee: e.target.value })} className="w-full border rounded px-3 py-2" />
                  <button type="button" onClick={calculateTravelFee} disabled={calculatingFee} className="text-xs whitespace-nowrap text-secondary font-semibold border rounded px-2">
                    {calculatingFee ? '...' : 'Calc from Zip'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h2 className="font-bold text-dark mb-3">Coupon Code</h2>
            <div className="flex gap-2">
              <input placeholder="Coupon Code" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} className="flex-1 border rounded px-3 py-2" />
              <button type="button" onClick={applyCoupon} disabled={applyingCoupon} className="text-secondary font-semibold text-sm border rounded px-3">
                {applyingCoupon ? 'Checking...' : 'Apply'}
              </button>
            </div>
            {couponMessage && <p className="text-xs text-body mt-1">{couponMessage}</p>}
          </div>

          <div className="border-t pt-4">
            <label className="block text-xs text-body mb-1">Notes (visible to customer)</label>
            <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full border rounded px-3 py-2 mb-3" />
            <label className="block text-xs text-body mb-1">Internal Notes (never sent to customer)</label>
            <textarea placeholder="Internal Notes" value={form.internalNotes} onChange={(e) => setForm({ ...form, internalNotes: e.target.value })} rows={2} className="w-full border rounded px-3 py-2" />
          </div>

          <div className="border-t pt-4">
            <label className="block text-xs text-body mb-1">Setup Surface</label>
            <select value={form.setupSurface} onChange={(e) => setForm({ ...form, setupSurface: e.target.value })} className="w-full border rounded px-3 py-2 mb-3">
              <option value="">-- Select --</option>
              {setupSurfaces.map((s) => (<option key={s.id} value={s.name}>{s.name}</option>))}
            </select>
            <label className="block text-xs text-body mb-1">Is this event at a public park?</label>
            <select value={form.isPublicPark ? 'yes' : 'no'} onChange={(e) => setForm({ ...form, isPublicPark: e.target.value === 'yes' })} className="w-full border rounded px-3 py-2 mb-3">
              <option value="no">No</option>
              <option value="yes">Yes - customer must provide/rent a generator</option>
            </select>
            <label className="block text-xs text-body mb-1">Reference (how did they hear about us?)</label>
            <select value={form.referenceSource} onChange={(e) => setForm({ ...form, referenceSource: e.target.value })} className="w-full border rounded px-3 py-2">
              <option value="">-- Select --</option>
              {references.map((r) => (<option key={r.id} value={r.name}>{r.name}</option>))}
            </select>
          </div>

          <div className="border-t pt-4">
            <label className="block text-xs text-body mb-1">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border rounded px-3 py-2">
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="border-t pt-4 space-y-3 bg-yellow-50 rounded p-4">
            <h2 className="font-bold text-dark">Important Information</h2>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={agreeDeposit} onChange={(e) => setAgreeDeposit(e.target.checked)} className="mt-1" required />
              <span>I understand that the deposit required to reserve this rental is <strong>non-refundable</strong>.</span>
            </label>
            {hasBounceHouse && (
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={agreeElectricity} onChange={(e) => setAgreeElectricity(e.target.checked)} className="mt-1" required />
                <span>This order includes an inflatable/bounce house. I understand a standard 110v electrical outlet must be available <strong>within 50ft</strong> of the setup location.</span>
              </label>
            )}
          </div>

          <div className="bg-gray-50 rounded p-4 space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            {exactTimeFeeAmount > 0 && (
              <div className="flex justify-between"><span>{exactTimeFee ? exactTimeFee.name : "Exact Time"} Fee</span><span>${exactTimeFeeAmount.toFixed(2)}</span></div>
            )}
            {travelFeeAmount > 0 && (
              <div className="flex justify-between"><span>Travel Fee</span><span>${travelFeeAmount.toFixed(2)}</span></div>
            )}
            {couponDiscount > 0 && (
              <div className="flex justify-between"><span>Coupon Discount</span><span>-${couponDiscount.toFixed(2)}</span></div>
            )}
            <div className="flex justify-between"><span>Tax ({taxRate}%)</span><span>${taxAmount.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold"><span>Total</span><span>${totalAmount.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Deposit Due {depositRule ? `(${depositRule.type === 'percentage' ? depositRule.amount + '%' : '$' + depositRule.amount})` : ''}</span><span>${depositAmount.toFixed(2)}</span></div>
          </div>

          <p className="text-xs text-body">This will be created as a Quote. You'll continue to Payment Options next, where you can take a payment now or send the quote to the customer first.</p>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep('cart')} className="border rounded px-4 py-2 text-sm font-semibold text-body">&lt;&lt; Back to Cart</button>
            <button type="submit" disabled={submitting} className="btn-admin flex-1">{submitting ? 'Creating...' : 'Continue to Payment Options >>'}</button>
          </div>
        </form>
      )}
      </>
      )}
    </div>
  )
}
  
export default function NewOrderPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <NewOrderPageInner />
    </Suspense>
  )
}
