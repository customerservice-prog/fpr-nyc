'use client'

import { use, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import CardSetupLink from '@/components/admin/CardSetupLink'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { findPoleTentSurfaceIssue, findFrameTentSurfaceIssue } from '@/lib/tentSurfaceRules'

interface OrderDetail {
  id: string
  orderNumber: string
  status: string
  eventDate: string
  eventEndDate?: string | null
  eventAddress?: string
  eventCity?: string
  eventState?: string
  eventZip?: string
  deliveryType: string
  eventTimeSlot?: string | null
  pickupTimeSlot?: string | null
  subtotal: number
  rentalDays?: number | null
  durationLabel?: string | null
  durationFee?: number | null
  specialRequestFee?: number | null
  specialRequestNames?: string | null
  deliveryFee?: number | null
  deliveryDistance?: number | null
  taxRate?: number | null
  taxAmount?: number | null
  couponCode?: string | null
  couponDiscount?: number | null
  customerId?: string | null
  raincheckId?: string | null
  raincheckApplied?: number | null
  damageWaiver?: boolean
  damageWaiverFee?: number | null
  lastMinuteFeeAmount?: number | null
  tipAmount?: number | null
  totalAmount: number
  amountPaid: number
  balanceDue: number
  notes?: string
  restrictionMatchedIds?: string[]
  restrictionOverrideAt?: string | null
  restrictionOverrideByName?: string | null
  restrictionOverrideReason?: string | null
  internalNotes?: string
  followUpsPaused?: boolean
  scheduleApprovedUnpaid?: boolean
  contractSignedAt?: string | null
  contractSignatureName?: string | null
  locationName?: string | null
  generalDiscount?: number | null
  overrideTravelFee?: number | null
  overrideDepositAmount?: number | null
  overrideTaxAmount?: number | null; overrideDamageWaiverFee?: number | null
  miscellaneousFees?: number | null
  customer: {
    firstName: string
    lastName: string
    email: string
    phone?: string
  }
  items: Array<{
    id: string
    itemId?: string | null
    itemName: string
    quantity: number
    unitPrice: number
    total: number
  }>
  payments: Array<{
    id: string
    amount: number
    method: string
    stripePaymentId?: string | null
    notes?: string | null
    recordedByName?: string | null
    createdAt: string
  }>
  stripeCustomerId?: string | null
  savedPaymentMethodId?: string | null
  cardOnFileConsentAt?: string | null
  cardOnFileConsentVersion?: string | null
  additionalCharges?: Array<{
    id: string
    type: string
    amount: number
    reason: string
    status: string
    stripePaymentIntentId?: string | null
    failureMessage?: string | null
    createdByName?: string | null
    createdAt: string
  }>
  contacts?: Array<{
      id: string
      name: string
      role: string
      phone?: string | null
      email?: string | null
      note?: string | null
  }>
}

interface CatalogItem {
  id: string
  name: string
  cost: number
  category?: { name: string } | null
}

interface EditItem {
  itemId?: string
  itemName: string
  quantity: number
  unitPrice: number
}

const DROPOFF_SLOT_LABELS = [
  'Morning (8am - 12pm)',
  'Afternoon (12pm - 4pm)',
  'Evening (4pm - 7pm)',
  'Overnight Rental (picked up the next day)',
]

const PICKUP_SLOT_LABELS = [
  'Same Day Evening Pickup',
  'Next Day Morning Pickup',
  'Next Day Afternoon Pickup',
]

function formatTimeSlot(slot: string | null | undefined): string {
  if (!slot) return ''
  const m = slot.match(/^exact_(\d{1,2})(\d{2})$/)
  if (m) {
    let hour = parseInt(m[1], 10)
    const min = m[2]
    const ampm = hour >= 12 ? 'PM' : 'AM'
    let displayHour = hour % 12
    if (displayHour === 0) displayHour = 12
    return displayHour + ':' + min + ' ' + ampm + ' (Exact Time)'
  }
  return slot
}

function formatPhoneDisplay(phone?: string | null): string {
    if (!phone) return ''
    const digits = phone.replace(/\D/g, '')
    if (digits.length === 10) return '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6)
    if (digits.length === 11 && digits[0] === '1') return '(' + digits.slice(1, 4) + ') ' + digits.slice(4, 7) + '-' + digits.slice(7)
    return phone
}


function Section({ title, action, children, accent }: { title: string; action?: ReactNode; children: ReactNode; accent?: string }) {
  return (
    <div className={'bg-white border border-gray-200 rounded-lg shadow-sm p-5' + (accent ? ' border-l-4 ' + accent : '')}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[16px] font-semibold text-dark">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

function Advanced({ title, subtitle, open, onToggle, danger, children }: { title: string; subtitle?: string; open: boolean; onToggle: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <div className={'border rounded-lg bg-white ' + (danger ? 'border-red-200' : 'border-gray-200')}>
      <button onClick={onToggle} type="button" className="w-full flex items-center justify-between px-4 py-3 text-left no-print">
        <span>
          <span className={'text-sm font-semibold ' + (danger ? 'text-red-700' : 'text-dark')}>{title}</span>
          {subtitle && <span className="block text-xs text-body mt-0.5">{subtitle}</span>}
        </span>
        <span className="text-body text-sm">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="px-4 pb-4 border-t border-gray-100 pt-4">{children}</div>}
    </div>
  )
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [status, setStatus] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [followUpsPaused, setFollowUpsPaused] = useState(false)
  const [customerNotes, setCustomerNotes] = useState('')
  const [setupSurface, setSetupSurface] = useState('')
  const [isPublicPark, setIsPublicPark] = useState(false)
  const [referenceSource, setReferenceSource] = useState('')
  const [setupSurfaceOptions, setSetupSurfaceOptions] = useState<{ id: string; name: string }[]>([])
  const [referenceOptions, setReferenceOptions] = useState<{ id: string; name: string }[]>([])
  const [paymentAmount, setPaymentAmount] = useState(''); const [paymentNotes, setPaymentNotes] = useState(''); const [paymentSkipEmail, setPaymentSkipEmail] = useState(false) // default to NOT emailing the customer on manual payment/refund entries; staff can opt in by unchecking
  const [sendingQuote, setSendingQuote] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [sendingCancellation, setSendingCancellation] = useState(false)
  const [prePayReminderDisabled, setPrePayReminderDisabled] = useState(false)
  const [scheduleApprovedUnpaid, setScheduleApprovedUnpaid] = useState(true)
  const [locationName, setLocationName] = useState('')
  const [generalDiscount, setGeneralDiscount] = useState('0')
  const [overrideTravelFee, setOverrideTravelFee] = useState('')
  const [overrideDepositAmount, setOverrideDepositAmount] = useState('')
  const [overrideTaxAmount, setOverrideTaxAmount] = useState(''); const [overrideDamageWaiverFee, setOverrideDamageWaiverFee] = useState('')
  const [miscellaneousFees, setMiscellaneousFees] = useState('0')
  const [customerRainchecks, setCustomerRainchecks] = useState<any[]>([])
  const [selectedRaincheckId, setSelectedRaincheckId] = useState('')
  const [raincheckAmountInput, setRaincheckAmountInput] = useState('')
  const [applyingRaincheck, setApplyingRaincheck] = useState(false)
  const [newRaincheckAmount, setNewRaincheckAmount] = useState('')
  const [newRaincheckReason, setNewRaincheckReason] = useState('')
  const [issuingRaincheck, setIssuingRaincheck] = useState(false)
  const [editItems, setEditItems] = useState<EditItem[]>([])
  const [editEventDate, setEditEventDate] = useState('')
  const [editEventEndDate, setEditEventEndDate] = useState('')
  const [editDeliveryType, setEditDeliveryType] = useState<'delivery' | 'pickup'>('delivery')
  const [editDropoffSlot, setEditDropoffSlot] = useState('')
  const [editPickupSlot, setEditPickupSlot] = useState('')
  const [savingDateTime, setSavingDateTime] = useState(false)
  const [editEventAddress, setEditEventAddress] = useState('')
  const [editEventCity, setEditEventCity] = useState('')
  const [editEventZip, setEditEventZip] = useState('')
  const [editEventState, setEditEventState] = useState('')
  const [savingAddress, setSavingAddress] = useState(false)
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [newItemCatalogId, setNewItemCatalogId] = useState('')
  const [newItemName, setNewItemName] = useState('')
  const [newItemQty, setNewItemQty] = useState('1')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [savingItems, setSavingItems] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)

  // --- UI-only state added for the workspace redesign (no business logic here) ---
  const [moreOpen, setMoreOpen] = useState(false)
  const [scheduleEditing, setScheduleEditing] = useState(false)
  const [addressEditing, setAddressEditing] = useState(false)
  const [itemsEditing, setItemsEditing] = useState(false)
  const [addPaymentOpen, setAddPaymentOpen] = useState(false)
  const [chargeCardOpen, setChargeCardOpen] = useState(false)
  const [chargeCardAmount, setChargeCardAmount] = useState('')
  const [chargeCardReason, setChargeCardReason] = useState('')
  const [chargeCardAddsToTotal, setChargeCardAddsToTotal] = useState(false)
  const [chargeCardType, setChargeCardType] = useState('damage')
  const [chargingCard, setChargingCard] = useState(false)
  const [refreshingCard, setRefreshingCard] = useState(false)
  const [paymentMenuOpenId, setPaymentMenuOpenId] = useState<string | null>(null)
  const [internalNotesEditing, setInternalNotesEditing] = useState(false)
  const [customerNotesEditing, setCustomerNotesEditing] = useState(false)
  const [communicationsOpen, setCommunicationsOpen] = useState(false)
  const [billingOpen, setBillingOpen] = useState(false)
  const [raincheckOpen, setRaincheckOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [dangerOpen, setDangerOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [customerEditOpen, setCustomerEditOpen] = useState(false)
  const [customerFirstName, setCustomerFirstName] = useState('')
  const [customerLastName, setCustomerLastName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerSecondaryPhone, setCustomerSecondaryPhone] = useState('')
  const [customerSecondaryEmail, setCustomerSecondaryEmail] = useState('')
  const [savingCustomer, setSavingCustomer] = useState(false)
  const [contactsOpen, setContactsOpen] = useState(false)
  const [orderContacts, setOrderContacts] = useState<any[]>([])
  const [contactEditingId, setContactEditingId] = useState<string | null>(null)
  const [contactFormOpen, setContactFormOpen] = useState(false)
  const [contactName, setContactName] = useState('')
  const [contactRole, setContactRole] = useState('Day-Of')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactNote, setContactNote] = useState('')
  const [savingContact, setSavingContact] = useState(false)
  const [receiptRecipientsOpen, setReceiptRecipientsOpen] = useState(false)
  const [receiptRecipients, setReceiptRecipients] = useState<{ label: string; email: string; checked: boolean }[]>([]); const [contactScope, setContactScope] = useState<'order' | 'profile'>('order')

  const loadOrder = () => {
    fetch('/api/admin/orders/' + id)
      .then((r) => r.json())
      .then((d) => {
        setOrder(d.order)
        setStatus(d.order.status)
        setInternalNotes(d.order.internalNotes || '')
        setFollowUpsPaused(!!d.order.followUpsPaused)
        setCustomerNotes(d.order.notes || '')
        setSetupSurface(d.order.setupSurface || '')
        setIsPublicPark(!!d.order.isPublicPark)
        setReferenceSource(d.order.referenceSource || '')
        setPrePayReminderDisabled(d.order.prePayReminderDisabled || false)
        setScheduleApprovedUnpaid(d.order.scheduleApprovedUnpaid !== false)
        setLocationName(d.order.locationName || '')
        setGeneralDiscount(String(d.order.generalDiscount || 0))
        setOverrideTravelFee(d.order.overrideTravelFee != null ? String(d.order.overrideTravelFee) : '')
        setOverrideDepositAmount(d.order.overrideDepositAmount != null ? String(d.order.overrideDepositAmount) : '')
        setOverrideTaxAmount(d.order.overrideTaxAmount != null ? String(d.order.overrideTaxAmount) : ''); setOverrideDamageWaiverFee(d.order.overrideDamageWaiverFee != null ? String(d.order.overrideDamageWaiverFee) : '')
        setMiscellaneousFees(String(d.order.miscellaneousFees || 0))
        setEditItems(
          d.order.items.map((i: any) => ({
            itemId: i.itemId || undefined,
            itemName: i.itemName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          }))
        )
        setEditEventDate(d.order.eventDate ? d.order.eventDate.slice(0, 10) : '')
        setEditEventEndDate(d.order.eventEndDate ? d.order.eventEndDate.slice(0, 10) : '')
        setEditDeliveryType(d.order.deliveryType === 'pickup' ? 'pickup' : 'delivery')
        setEditDropoffSlot(d.order.eventTimeSlot || '')
        setEditPickupSlot(d.order.pickupTimeSlot || '')
        setEditEventAddress(d.order.eventAddress || '')
        setEditEventCity(d.order.eventCity || '')
        setEditEventZip(d.order.eventZip || '')
        setEditEventState(d.order.eventState || '')
        setCustomerFirstName(d.order.customer.firstName || '')
        setCustomerLastName(d.order.customer.lastName || '')
        setCustomerEmail(d.order.customer.email || '')
        setCustomerPhone(d.order.customer.phone || '')
        setCustomerSecondaryPhone((d.order.customer as any).secondaryPhone || '')
        setCustomerSecondaryEmail((d.order.customer as any).secondaryEmail || '')
        setOrderContacts(d.order.contacts || [])
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadOrder()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const loadRainchecks = (customerId: string) => {
    fetch('/api/admin/rainchecks?customerId=' + customerId)
      .then((r) => r.json())
      .then((d) => setCustomerRainchecks(d.rainchecks || []))
      .catch(() => {})
  }

  useEffect(() => {
    if (order?.customerId) loadRainchecks(order.customerId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.customerId])

  useEffect(() => {
    fetch('/api/items')
      .then((r) => r.json())
      .then((d) => setCatalog(d.items || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/admin/setup-surfaces')
      .then((r) => r.json())
      .then((d) => setSetupSurfaceOptions((d.surfaces || []).filter((s: any) => s.isActive)))
      .catch(() => {})
    fetch('/api/admin/references')
      .then((r) => r.json())
      .then((d) => setReferenceOptions((d.references || []).filter((r: any) => r.isActive)))
      .catch(() => {})
  }, [])

  const saveOrder = async () => {
    if (order) {
      const poleIssue = findPoleTentSurfaceIssue(order.items, setupSurface); const frameIssue = findFrameTentSurfaceIssue(order.items, setupSurface); if (frameIssue && !window.confirm(frameIssue + ' Save anyway?')) { return }
      if (poleIssue && !window.confirm(poleIssue + '\n\nSave anyway?')) {
        return
      }
    }
    const totals = recalcTotals()
    const res = await fetch('/api/admin/orders/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...totals,
        status,
        internalNotes,
        followUpsPaused,
        notes: customerNotes,
        prePayReminderDisabled,
        scheduleApprovedUnpaid,
        setupSurface,
        isPublicPark,
        referenceSource,
        locationName,
        generalDiscount: parseFloat(generalDiscount) || 0,
        overrideTravelFee: overrideTravelFee === '' ? null : parseFloat(overrideTravelFee),
        overrideDepositAmount: overrideDepositAmount === '' ? null : parseFloat(overrideDepositAmount),
        overrideTaxAmount: overrideTaxAmount === '' ? null : parseFloat(overrideTaxAmount), overrideDamageWaiverFee: overrideDamageWaiverFee === '' ? null : parseFloat(overrideDamageWaiverFee),
        miscellaneousFees: parseFloat(miscellaneousFees) || 0,
      }),
    })
    if (res.ok) {
      await loadOrder()
      toast.success('Order updated')
    } else toast.error('Failed to update')
  }

  const applyRaincheck = async () => {
    if (!selectedRaincheckId) {
      toast.error('Select a raincheck first')
      return
    }
    const amt = parseFloat(raincheckAmountInput)
    if (isNaN(amt) || amt < 0) {
      toast.error('Enter a valid amount')
      return
    }
    setApplyingRaincheck(true)
    try {
      const res = await fetch('/api/admin/rainchecks/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raincheckId: selectedRaincheckId, orderId: id, amount: amt }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to apply raincheck')
        return
      }
      toast.success('Raincheck applied')
      loadOrder()
      if (order?.customerId) loadRainchecks(order.customerId)
    } catch {
      toast.error('Failed to apply raincheck')
    } finally {
      setApplyingRaincheck(false)
    }
  }

  const issueRaincheck = async () => {
    if (!order) return
    const amt = parseFloat(newRaincheckAmount)
    if (isNaN(amt) || amt <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    setIssuingRaincheck(true)
    try {
      const res = await fetch('/api/admin/rainchecks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: order.customerId, amount: amt, reason: newRaincheckReason }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to issue raincheck')
        return
      }
      toast.success('Raincheck issued')
      setNewRaincheckAmount('')
      setNewRaincheckReason('')
      if (order.customerId) loadRainchecks(order.customerId)
    } catch {
      toast.error('Failed to issue raincheck')
    } finally {
      setIssuingRaincheck(false)
    }
  }

  const addPayment = async () => {
    if (!paymentAmount) return; if (!paymentNotes.trim()) { toast.error('Please add a note explaining this payment before saving'); return }
    const res = await fetch('/api/admin/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: id, amount: paymentAmount, notes: paymentNotes, skipEmail: paymentSkipEmail , method: paymentMethod}),
    })
    if (res.ok) {
      toast.success('Payment recorded')
      setPaymentAmount(''); setPaymentNotes(''); setPaymentSkipEmail(false)
      const d = await fetch('/api/admin/orders/' + id).then((r) => r.json())
      setOrder(d.order)
      setAddPaymentOpen(false)
    } else toast.error('Failed')
  }

  const chargeSavedCard = async () => {
    if (chargingCard || !order) return
    const amount = Math.round(Number(chargeCardAmount) * 100) / 100
    const reason = chargeCardReason.trim()
    if (!Number.isFinite(amount) || amount <= 0) { toast.error('Enter a valid amount'); return }
    if (!reason) { toast.error('Enter the reason and documentation'); return }
    if (chargeCardAddsToTotal && (!order.cardOnFileConsentAt || !order.cardOnFileConsentVersion)) {
      toast.error('Customer authorization is required before adding a new fee.')
      return
    }

    const payload = {
      amount,
      reason,
      addToOrderTotal: chargeCardAddsToTotal,
      chargeType: chargeCardAddsToTotal ? chargeCardType : 'balance',
    }
    const storageKey = 'nyc-saved-card-attempt-' + id
    const fingerprint = JSON.stringify(payload)
    if (!window.confirm('Charge the card on file $' + amount.toFixed(2) + ' for: ' + reason + '?')) return

    setChargingCard(true)
    try {
      const stored = JSON.parse(sessionStorage.getItem(storageKey) || 'null')
      const requestKey = stored?.fingerprint === fingerprint ? stored.requestKey : crypto.randomUUID()
      sessionStorage.setItem(storageKey, JSON.stringify({ fingerprint, requestKey }))
      const response = await fetch('/api/admin/orders/' + id + '/charge-saved-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, requestKey }),
      })
      const data = await response.json()
      if (data.success) {
        sessionStorage.removeItem(storageKey)
        toast.success('Card charged successfully')
        setChargeCardAmount('')
        setChargeCardReason('')
        setChargeCardAddsToTotal(false)
        setChargeCardType('damage')
        setChargeCardOpen(false)
      } else {
        toast.error(data.error || data.message || 'Payment is awaiting confirmation. Do not add the fee again.')
      }
      const refreshed = await fetch('/api/admin/orders/' + id)
      if (refreshed.ok) setOrder((await refreshed.json()).order)
    } catch {
      toast.error('The result is unknown. Retry the same details to check this attempt; do not create another charge.')
    } finally {
      setChargingCard(false)
    }
  }

  const removePayment = async (paymentId: string) => {
    if (!window.confirm('Remove this payment record? This will update the balance due and cannot be undone.')) return
    const res = await fetch('/api/admin/payments/' + paymentId, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Payment removed')
      const d = await fetch('/api/admin/orders/' + id).then((r) => r.json())
      setOrder(d.order)
    } else toast.error('Failed to remove payment')
  }

  const refundPayment = async (paymentId: string, amount: number) => {
    const input = window.prompt('Refund how much for this $' + amount.toFixed(2) + ' payment? Enter an amount up to ' + amount.toFixed(2) + '.', amount.toFixed(2))
    if (input === null) return
    const refundAmount = parseFloat(input)
    if (!refundAmount || refundAmount <= 0 || refundAmount > amount + 0.01) {
      toast.error('Enter a valid refund amount')
      return
    }
    if (!window.confirm("Refund $" + refundAmount.toFixed(2) + " to the customer's card via Stripe? This cannot be undone.")) return
    const res = await fetch('/api/admin/orders/' + id + '/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId, amount: refundAmount }),
    })
    const d = await res.json()
    if (res.ok) {
      toast.success('Refund issued successfully')
      setOrder((prev: any) => prev ? { ...prev, ...d.order } : d.order)
    } else {
      toast.error(d.error || 'Failed to process refund')
    }
  }

  const copyPaymentLink = async () => {
    const link = window.location.origin + '/pay/' + id
    try {
      await navigator.clipboard.writeText(link)
      toast.success('Payment link copied to clipboard')
    } catch {
      toast.error(link)
    }
  }

  const copyContractLink = async () => {
    const link = window.location.origin + '/contract/' + id
    try {
      await navigator.clipboard.writeText(link)
      toast.success('Contract link copied to clipboard')
    } catch {
      toast.error(link)
    }
  }

  const syncWithStripe = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/admin/orders/' + id + '/stripe-sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Sync failed')
      } else if (data.recovered && data.recovered.length > 0) {
        const total = data.recovered.reduce((sum: number, p: any) => sum + p.amount, 0)
        toast.success('Recovered ' + data.recovered.length + ' missing payment(s) totaling $' + total.toFixed(2))
        loadOrder()
      } else {
        toast.success('No missing payments found - records match Stripe')
      }
    } catch {
      toast.error('Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const sendQuoteEmail = async () => {
    setSendingQuote(true)
    try {
      const res = await fetch('/api/admin/orders/' + id + '/send-quote', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')
      if (data.simulated) {
        toast.success('Email not configured yet - link copied instead')
        await navigator.clipboard.writeText(data.payLink)
      } else {
        toast.success(order && order.amountPaid > 0 ? 'Updated receipt emailed to customer' : 'Quote emailed to customer')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send quote')
    } finally {
      setSendingQuote(false)
    }
  }

  const sendCancellationMessage = async () => {
    const message = window.prompt('Enter the message to send to this customer about their canceled order (e.g. offer a raincheck):')
    if (!message || !message.trim()) return
    setSendingCancellation(true)
    try {
      const res = await fetch('/api/admin/orders/' + id + '/send-cancellation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')
      toast.success('Cancellation message sent to customer')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSendingCancellation(false)
    }
  }

  const deleteOrder = async () => {
    if (!order) return
    const confirmed = window.confirm(
      'Permanently delete order ' + order.orderNumber + '? This cannot be undone.'
    )
    if (!confirmed) return
    setDeleting(true)
    try {
      const res = await fetch('/api/admin/orders/' + id, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Order deleted')
      router.push('/admin/orders')
    } catch {
      toast.error('Failed to delete order')
    } finally {
      setDeleting(false)
    }
  }

  const cancelOrder = async () => {
    if (!order) return
    const confirmed = window.confirm(
      'Cancel order ' + order.orderNumber + '? It will be marked Canceled and removed from the schedule. This does not delete the order or issue a refund.'
    )
    if (!confirmed) return
    setCancelling(true)
    try {
      const res = await fetch('/api/admin/orders/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'canceled' }),
      })
      if (!res.ok) throw new Error('Failed to cancel')
      setStatus('canceled')
      toast.success('Order canceled')
      loadOrder()
    } catch {
      toast.error('Failed to cancel order')
    } finally {
      setCancelling(false)
    }
  }

  const selectCatalogItem = (id: string) => {
    setNewItemCatalogId(id)
    const found = catalog.find((c) => c.id === id)
    if (found) {
      setNewItemName(found.name)
      setNewItemPrice(String(found.cost))
    }
    setCatalogOpen(false)
  }

  const addItemRow = () => {
    if (!newItemName.trim() || !newItemPrice || !newItemQty) {
      toast.error('Enter an item name, quantity, and price')
      return
    }
    setEditItems((prev) => [
      ...prev,
      {
        itemId: newItemCatalogId || undefined,
        itemName: newItemName.trim(),
        quantity: parseInt(newItemQty) || 1,
        unitPrice: parseFloat(newItemPrice) || 0,
      },
    ])
    setNewItemCatalogId('')
    setNewItemName('')
    setNewItemQty('1')
    setNewItemPrice('')
    setCatalogOpen(false)
  }

  const removeItemRow = (idx: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateItemRow = (idx: number, field: 'quantity' | 'unitPrice', value: number) => {
    setEditItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)))
  }

  const allItemsZeroPriced = editItems.length > 0 && editItems.every((i) => !i.unitPrice)
  const legacyLumpSumSubtotal = allItemsZeroPriced && (order?.subtotal || 0) > 0
  const editItemsSubtotal = legacyLumpSumSubtotal
    ? (order?.subtotal || 0)
    : Math.round(editItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0) * 100) / 100

  const recalcTotals = () => {
    const durationFee = order?.durationFee || 0
    const specialRequestFee = order?.specialRequestFee || 0
    const baseDeliveryFee = order?.deliveryFee || 0
    const travelFeeOverrideVal = overrideTravelFee === '' ? null : parseFloat(overrideTravelFee)
    const deliveryFee = travelFeeOverrideVal != null && !isNaN(travelFeeOverrideVal) ? travelFeeOverrideVal : baseDeliveryFee
    const damageWaiverOverrideVal = overrideDamageWaiverFee === '' ? null : parseFloat(overrideDamageWaiverFee); const damageWaiverFee = damageWaiverOverrideVal != null && !isNaN(damageWaiverOverrideVal) ? damageWaiverOverrideVal : (order?.damageWaiverFee || 0)
    const couponDiscount = order?.couponDiscount || 0
    const generalDiscountVal = parseFloat(generalDiscount) || 0
    const miscFeesVal = parseFloat(miscellaneousFees) || 0
    const lastMinuteFeeAmount = order?.lastMinuteFeeAmount || 0
    const tipAmount = order?.tipAmount || 0
    const taxRate = order?.taxRate || 0
    const adjustedSubtotal = Math.round((editItemsSubtotal + durationFee) * 100) / 100
    const raincheckAppliedVal = order?.raincheckApplied || 0
    const discountedSubtotal = Math.max(adjustedSubtotal - couponDiscount - generalDiscountVal, 0)
    const taxableBase = discountedSubtotal + deliveryFee + damageWaiverFee + specialRequestFee + lastMinuteFeeAmount + miscFeesVal
    const taxOverrideVal = overrideTaxAmount === '' ? null : parseFloat(overrideTaxAmount)
    const taxAmount = taxOverrideVal != null && !isNaN(taxOverrideVal) ? taxOverrideVal : Math.round(taxableBase * (taxRate / 100) * 100) / 100
    const totalAmount = Math.round((discountedSubtotal + deliveryFee + damageWaiverFee + specialRequestFee + taxAmount + lastMinuteFeeAmount + miscFeesVal) * 100) / 100
    const balanceDue = Math.round((totalAmount - (order?.amountPaid || 0) - raincheckAppliedVal) * 100) / 100
    return { subtotal: editItemsSubtotal, taxAmount, totalAmount, balanceDue, deliveryFee, damageWaiverFee }
  }

  const saveItems = async (sendReceiptAfter: boolean) => { if (!order) return; const poleIssue = findPoleTentSurfaceIssue(editItems, setupSurface); if (poleIssue && !window.confirm(poleIssue + ' Save items anyway?')) { return } const frameIssue = findFrameTentSurfaceIssue(editItems, setupSurface); if (frameIssue && !window.confirm(frameIssue + ' Save items anyway?')) { return }
    if (!order) return
    if (editItems.length === 0) {
      toast.error('An order must have at least one item')
      return
    const poleIssue = findPoleTentSurfaceIssue(editItems, setupSurface)
    if (poleIssue && !window.confirm(poleIssue + '\n\nSave items anyway?')) {
      return
    }
    }
    setSavingItems(true)
    try {
      const itemsPayload = editItems.map((i) => ({
        itemId: i.itemId || undefined,
        itemName: i.itemName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: Math.round(i.quantity * i.unitPrice * 100) / 100,
      }))
      const totals = recalcTotals()
      const res = await fetch('/api/admin/orders/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsPayload,
          ...totals,
          generalDiscount: parseFloat(generalDiscount) || 0,
          overrideTravelFee: overrideTravelFee === '' ? null : parseFloat(overrideTravelFee),
          overrideTaxAmount: overrideTaxAmount === '' ? null : parseFloat(overrideTaxAmount), overrideDamageWaiverFee: overrideDamageWaiverFee === '' ? null : parseFloat(overrideDamageWaiverFee),
          miscellaneousFees: parseFloat(miscellaneousFees) || 0,
        }),
      })
      if (!res.ok) throw new Error('Failed to save items')
      loadOrder()
      toast.success('Items updated')
      if (sendReceiptAfter) {
        await sendQuoteEmail()
      }
      setItemsEditing(false)
    } catch {
      toast.error('Failed to save item changes')
    } finally {
      setSavingItems(false)
    }
  }

  const saveDateTime = async () => {
    if (!order) return
    setSavingDateTime(true)
    try {
      const res = await fetch('/api/admin/orders/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventDate: editEventDate || undefined,
          eventEndDate: editEventEndDate || undefined,
          deliveryType: editDeliveryType,
          eventTimeSlot: editDropoffSlot,
          pickupTimeSlot: editPickupSlot,
        }),
      })
      if (!res.ok) throw new Error('Failed to save date/time')
      loadOrder()
      toast.success('Schedule updated')
      setScheduleEditing(false)
    } catch {
      toast.error('Failed to save date/time changes')
    } finally {
      setSavingDateTime(false)
    }
  }

  const saveAddress = async () => {
    if (!order) return
    setSavingAddress(true)
    try {
      const res = await fetch('/api/admin/orders/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventAddress: editEventAddress,
          eventCity: editEventCity,
          eventZip: editEventZip,
          eventState: editEventState,
        }),
      })
      if (!res.ok) throw new Error('Failed to save address')
      loadOrder()
      toast.success('Delivery address updated')
      setAddressEditing(false)
    } catch {
      toast.error('Failed to save address changes')
    } finally {
      setSavingAddress(false)
    }
  }

  const saveCustomerEdit = async () => {
      if (!order?.customerId) return
      if (!customerFirstName.trim() || !customerEmail.trim()) { toast.error('First name and email are required'); return }
      setSavingCustomer(true)
      try {
            const res = await fetch('/api/admin/customers/' + order.customerId, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                              firstName: customerFirstName.trim(),
                              lastName: customerLastName.trim(),
                              email: customerEmail.trim(),
                              phone: customerPhone.trim(),
                              secondaryPhone: customerSecondaryPhone.trim(),
                              secondaryEmail: customerSecondaryEmail.trim(),
                    }),
            })
            if (!res.ok) throw new Error('Failed to update customer')
            toast.success('Customer profile updated')
            loadOrder()
            setCustomerEditOpen(false)
      } catch {
            toast.error('Failed to update customer')
      } finally {
            setSavingCustomer(false)
      }
  }

  const resetContactForm = () => {
      setContactEditingId(null)
      setContactName('')
      setContactRole('Day-Of')
      setContactPhone('')
      setContactEmail('')
      setContactNote(''); setContactScope('order')
  }

  const startEditContact = (c: any) => {
      setContactEditingId(c.id)
      setContactName(c.name || '')
      setContactRole(c.role || 'Other')
      setContactPhone(c.phone || '')
      setContactEmail(c.email || '')
      setContactNote(c.note || '')
      setContactFormOpen(true)
  }

  const saveContact = async () => {
      if (!order) return
      if (contactScope === 'profile' && !contactEditingId) { if (!contactPhone.trim() && !contactEmail.trim()) { toast.error('Enter a phone number or email for the customer profile'); return }; if (!order.customerId) return; setSavingContact(true); try { const res = await fetch('/api/admin/customers/' + order.customerId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ firstName: order.customer.firstName, lastName: order.customer.lastName, email: order.customer.email, phone: order.customer.phone, secondaryPhone: contactPhone.trim(), secondaryEmail: contactEmail.trim() }) }); if (!res.ok) throw new Error('Failed'); toast.success('Customer profile updated'); resetContactForm(); setContactFormOpen(false); loadOrder() } catch { toast.error('Failed to save contact') } finally { setSavingContact(false) }; return } if (!contactName.trim()) { toast.error('Contact name is required'); return }
      if (!contactPhone.trim() && !contactEmail.trim()) { toast.error('Enter a phone number or email for this contact'); return }
      setSavingContact(true)
      try {
            const payload = { name: contactName.trim(), role: contactRole, phone: contactPhone.trim(), email: contactEmail.trim(), note: contactNote.trim() }
            const url = '/api/admin/orders/' + id + '/contacts' + (contactEditingId ? ('/' + contactEditingId) : '')
            const res = await fetch(url, {
                    method: contactEditingId ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
            })
            const data = await res.json()
            if (!res.ok) { toast.error(data.error || 'Failed to save contact'); return }
            toast.success(contactEditingId ? 'Contact updated' : 'Contact added')
            resetContactForm()
            setContactFormOpen(false)
            loadOrder()
      } catch {
            toast.error('Failed to save contact')
      } finally {
            setSavingContact(false)
      }
  }

  const removeContact = async (contactId: string) => {
      if (!window.confirm('Remove this contact from the order?')) return
      try {
            const res = await fetch('/api/admin/orders/' + id + '/contacts/' + contactId, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed')
            toast.success('Contact removed')
            loadOrder()
      } catch {
            toast.error('Failed to remove contact')
      }
  }

  const openReceiptRecipients = () => {
      if (!order) return
      const options: { label: string; email: string; checked: boolean }[] = []
      options.push({ label: order.customer.firstName + ' ' + order.customer.lastName + ' (Primary)', email: order.customer.email, checked: true })
      if (customerSecondaryEmail) options.push({ label: 'Secondary Contact', email: customerSecondaryEmail, checked: false })
      orderContacts.forEach((c: any) => { if (c.email) options.push({ label: c.name + ' (' + c.role + ')', email: c.email, checked: false }) })
      setReceiptRecipients(options)
      setReceiptRecipientsOpen(true)
  }

  const sendReceiptToSelectedRecipients = async () => {
      const emails = receiptRecipients.filter((r) => r.checked).map((r) => r.email)
      if (emails.length === 0) { toast.error('Select at least one recipient'); return }
      setSendingQuote(true)
      try {
            const res = await fetch('/api/admin/orders/' + id + '/send-quote', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ recipients: emails }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to send')
            toast.success((order && order.amountPaid > 0 ? 'Receipt' : 'Quote') + ' sent to ' + emails.length + ' recipient' + (emails.length === 1 ? '' : 's'))
            setReceiptRecipientsOpen(false)
      } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to send receipt')
      } finally {
            setSendingQuote(false)
      }
  }
  

  if (!order) return <div className="p-4">Loading...</div>

  const liveTotals = recalcTotals()
  const deliveryTypeLabel = order.deliveryType === 'delivery' ? 'Delivery' : order.deliveryType === 'pickup' ? 'Customer Pickup' : (order.deliveryType.charAt(0).toUpperCase() + order.deliveryType.slice(1))
  const dropoffTimeLabel = formatTimeSlot(order.eventTimeSlot)
  const pickupTimeLabel = formatTimeSlot(order.pickupTimeSlot)
  const catalogQuery = newItemName.trim().toLowerCase()
  const filteredCatalog = catalogQuery
    ? catalog.filter((c) => (c.name + ' ' + (c.category?.name || '')).toLowerCase().includes(catalogQuery)).slice(0, 50)
    : catalog.slice(0, 50)
  const statusBadgeClass = status === 'active' ? 'badge badge-active' : status === 'quote' ? 'badge badge-quote' : status === 'canceled' ? 'badge badge-canceled' : status === 'completed' ? 'badge badge-completed' : 'badge badge-incomplete'
  const statusLabel = order.status.charAt(0).toUpperCase() + order.status.slice(1)

  // --- derived values for the redesigned workspace (presentation only) ---
  const noPaymentYet = order.amountPaid <= 0
  const isPaidInFull = !noPaymentYet && liveTotals.balanceDue <= 0
  const onSchedule = !noPaymentYet || scheduleApprovedUnpaid
  const scheduleReason = !noPaymentYet
    ? 'Payment recorded on this order'
    : scheduleApprovedUnpaid
    ? 'Manually approved despite no payment'
    : 'No payment recorded and not manually approved'
  const hasBillingOverrides = !!(locationName || (parseFloat(generalDiscount) || 0) > 0 || (parseFloat(miscellaneousFees) || 0) > 0 || overrideTravelFee !== '' || overrideTaxAmount !== '' || overrideDamageWaiverFee !== '' || overrideDepositAmount !== '')
  const hasRaincheckApplied = (order.raincheckApplied || 0) > 0
  const hasAdditionalDetails = !!(setupSurface || isPublicPark || referenceSource)
  const poleTentSurfaceIssue = findPoleTentSurfaceIssue(itemsEditing ? editItems : order.items, setupSurface) || findFrameTentSurfaceIssue(itemsEditing ? editItems : order.items, setupSurface)

  return (
    <div className="p-4 max-w-[1500px] mx-auto">
      <style jsx global>{'.print-only { display: none; } @media print { nav { display: none !important; } .no-print { display: none !important; } main { padding-top: 0 !important; } body { background: white !important; } .print-only { display: inline !important; } }'}</style>

      <Link href="/admin/orders" className="text-secondary text-sm hover:underline mb-4 block no-print">← Back to Orders</Link>

      <div className="print-header hidden items-center justify-between border-b-2 border-gray-800 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Friendly Party Rental NYC</h1>
          <p className="text-sm">Riverdale, NY and surrounding Downstate New York areas</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold">RENTAL AGREEMENT</h2>
          <p className="text-sm">Order #{order.orderNumber}</p>
          <p className="text-sm">Date: {formatDate(order.eventDate)}</p>
        </div>
      </div>

      <div className="mb-6 no-print">
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <h1 className="text-[28px] leading-tight font-bold text-dark">Order {order.orderNumber}</h1>
          <span className={statusBadgeClass}>{statusLabel}</span>
          {isPaidInFull && <span className="badge bg-green-50 text-green-700 border border-green-200">✓ Paid in Full</span>}
          {!isPaidInFull && liveTotals.balanceDue > 0 && <span className="badge bg-amber-50 text-amber-700 border border-amber-200">{formatCurrency(liveTotals.balanceDue)} Due</span>}
        </div>
        <p className="text-sm text-body mb-4">
          {order.customer.firstName} {order.customer.lastName} · {formatDate(order.eventDate)}{order.eventEndDate ? (' – ' + formatDate(order.eventEndDate)) : ''} · {deliveryTypeLabel}
        </p>

        {order.restrictionMatchedIds && order.restrictionMatchedIds.length > 0 && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm no-print">
            <p className="font-semibold text-red-800">Rental Restriction Match</p>
            <p className="text-red-700">This order matches an active rental restriction.</p>
            {order.restrictionOverrideAt && (
              <p className="text-red-700 mt-1">Approved by {order.restrictionOverrideByName || 'an admin'} on {formatDate(order.restrictionOverrideAt)}. Reason: {order.restrictionOverrideReason}</p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {liveTotals.balanceDue > 0 ? (
            <Link href={'/admin/orders/' + id + '/checkout'} className="btn-admin inline-flex items-center">Take Payment</Link>
          ) : (
            <a href={'/pay/' + id} target="_blank" rel="noopener noreferrer" className="btn-outline inline-flex items-center">View Payment Page</a>
          )}
          <a href={'/contract/' + id} target="_blank" rel="noopener noreferrer" className="btn-outline inline-flex items-center">View Contract</a>
          {order.status === 'canceled' && (
            <button onClick={sendCancellationMessage} disabled={sendingCancellation} className="btn-outline disabled:opacity-50">
              {sendingCancellation ? 'Sending...' : 'Send Cancellation Message'}
            </button>
          )}
          <div className="relative">
            <button onClick={() => setMoreOpen((v) => !v)} type="button" className="btn-outline">More ▾</button>
            {moreOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMoreOpen(false)} />
                <div className="absolute z-30 mt-1 left-0 w-72 bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-sm">
                  <a href={'/pay/' + id} target="_blank" rel="noopener noreferrer" onClick={() => setMoreOpen(false)} className="block px-3 py-2 hover:bg-gray-50 text-dark">Open Payment Page</a>
                  <button onClick={() => { setMoreOpen(false); copyPaymentLink() }} type="button" className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-dark">Copy Payment Link</button>
                  <button onClick={() => { setMoreOpen(false); openReceiptRecipients() }} disabled={sendingQuote} type="button" className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-dark disabled:opacity-50">
                    {sendingQuote ? 'Sending...' : order.amountPaid > 0 ? 'Send Updated Receipt' : 'Email Quote to Customer'}
                  </button>
                  <button onClick={() => { setMoreOpen(false); copyContractLink() }} type="button" className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-dark">Copy Contract Link</button>
                  <button onClick={() => { setMoreOpen(false); syncWithStripe() }} disabled={syncing} type="button" className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-dark disabled:opacity-50">{syncing ? 'Syncing...' : 'Sync Payment Status'}</button>
                  <button onClick={() => { setMoreOpen(false); window.print() }} type="button" className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-dark">Print</button>
                  <div className="border-t border-gray-100 my-1" />
                  {order.status !== 'canceled' && (
                    <button onClick={() => { setMoreOpen(false); cancelOrder() }} disabled={cancelling} type="button" className="block w-full text-left px-3 py-2 hover:bg-amber-50 text-amber-700 disabled:opacity-50">
                      {cancelling ? 'Cancelling...' : 'Cancel Order'}
                    </button>
                  )}
                  <button onClick={() => { setMoreOpen(false); deleteOrder() }} disabled={deleting} type="button" className="block w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 disabled:opacity-50">
                    {deleting ? 'Deleting...' : 'Delete Order'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <Section
            title="Schedule"
            accent="border-admin-green"
            action={<button onClick={() => setScheduleEditing((v) => !v)} type="button" className="text-secondary text-sm font-medium hover:underline no-print">{scheduleEditing ? 'Cancel' : 'Edit Schedule'}</button>}
          >
            {!scheduleEditing ? (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-lg border-l-4 border-admin-green bg-green-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-admin-green mb-2">Drop-Off</p>
                  <p className="text-sm font-semibold text-dark">{formatDate(order.eventDate)}</p>
                  <p className="text-sm text-body mt-1">{dropoffTimeLabel || 'No time window selected'}</p>
                </div>
                <div className="rounded-lg border-l-4 border-secondary bg-blue-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-secondary mb-2">Pickup</p>
                  <p className="text-sm font-semibold text-dark">{formatDate(order.eventEndDate || order.eventDate)}</p>
                  <p className="text-sm text-body mt-1">{pickupTimeLabel || 'No time window selected'}</p>
                  {!order.eventEndDate && /^(Next Day|Same Day)/i.test(order.pickupTimeSlot || '') && (
<p className="text-xs text-amber-700 mt-1 no-print">Schedule data needs review - pickup is marked "{order.pickupTimeSlot}" but no end date is set, so this is showing the drop-off date. Edit Schedule to set the correct pickup day.</p>
)}
                </div>
              </div>
            ) : (
              <div className="no-print">
                <div className="mb-4">
                  <label className="block text-xs text-body mb-1">Rental Method</label>
                  <select
                    value={editDeliveryType}
                    onChange={(e) => setEditDeliveryType(e.target.value === 'pickup' ? 'pickup' : 'delivery')}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="delivery">Delivery</option>
                    <option value="pickup">Customer Pickup</option>
                  </select>
                  {editDeliveryType !== order.deliveryType && (
                    <p className="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                      Changing the rental method updates this order&apos;s fulfillment. Review the delivery fee in Financial Summary separately before sending an updated receipt.
                    </p>
                  )}
                </div>
                <div className="grid md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-xs text-body mb-1">Event Date</label>
                    <input type="date" value={editEventDate} onChange={(e) => setEditEventDate(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-body mb-1">End Date (multi-day events)</label>
                    <input type="date" value={editEventEndDate} onChange={(e) => setEditEventEndDate(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-body mb-1">Drop-Off Time</label>
                    <select value={editDropoffSlot} onChange={(e) => setEditDropoffSlot(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2">
                      <option value="">Select a time window...</option>
                      {DROPOFF_SLOT_LABELS.map((label) => (
                        <option key={label} value={label}>{label}</option>
                      ))}
                      {editDropoffSlot && !DROPOFF_SLOT_LABELS.includes(editDropoffSlot) && (
                        <option value={editDropoffSlot}>{formatTimeSlot(editDropoffSlot)}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-body mb-1">Pickup Time</label>
                    <select value={editPickupSlot} onChange={(e) => { const val = e.target.value; setEditPickupSlot(val); if (/^Next Day/i.test(val) && !editEventEndDate && editEventDate) { const d = new Date(editEventDate + 'T00:00:00'); d.setDate(d.getDate() + 1); setEditEventEndDate(d.toISOString().slice(0, 10)) } }} className="w-full border border-gray-300 rounded px-3 py-2">
                      <option value="">Select a time window...</option>
                      {PICKUP_SLOT_LABELS.map((label) => (
                        <option key={label} value={label}>{label}</option>
                      ))}
                      {editPickupSlot && !PICKUP_SLOT_LABELS.includes(editPickupSlot) && (
                        <option value={editPickupSlot}>{formatTimeSlot(editPickupSlot)}</option>
                      )}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveDateTime} disabled={savingDateTime} type="button" className="btn-admin">{savingDateTime ? 'Saving...' : 'Save Schedule'}</button>
                  <button onClick={() => setScheduleEditing(false)} type="button" className="btn-outline">Cancel</button>
                </div>
              </div>
            )}
          </Section>

          <Section
            title="Delivery Address"
            accent="border-admin-green"
            action={<button onClick={() => setAddressEditing((v) => !v)} type="button" className="text-secondary text-sm font-medium hover:underline no-print">{addressEditing ? 'Cancel' : 'Edit'}</button>}
          >
            {!addressEditing ? (
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  {order.locationName && <p className="text-sm font-medium text-dark">{order.locationName}</p>}
                  <p className="text-sm text-body">{order.eventAddress}</p>
                  <p className="text-sm text-body">{order.eventCity}, {order.eventState} {order.eventZip}</p>
                </div>
                {order.deliveryType === 'delivery' && order.eventAddress && (
                  <a
                    href={'https://maps.google.com/?q=' + encodeURIComponent(order.eventAddress + ', ' + order.eventCity + ', ' + order.eventState + ' ' + order.eventZip)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-secondary text-xs font-medium hover:underline no-print whitespace-nowrap"
                  >
                    Open Directions →
                  </a>
                )}
              </div>
            ) : (
              <div className="no-print">
                <div className="grid md:grid-cols-2 gap-4 mb-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs text-body mb-1">Street Address</label>
                    <input type="text" value={editEventAddress} onChange={(e) => setEditEventAddress(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-body mb-1">City</label>
                    <input type="text" value={editEventCity} onChange={(e) => setEditEventCity(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-body mb-1">Zip Code</label>
                    <input type="text" value={editEventZip} onChange={(e) => setEditEventZip(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-body mb-1">State</label>
                    <input type="text" value={editEventState} onChange={(e) => setEditEventState(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveAddress} disabled={savingAddress} type="button" className="btn-admin">{savingAddress ? 'Saving...' : 'Save Delivery Address'}</button>
                  <button onClick={() => setAddressEditing(false)} type="button" className="btn-outline">Cancel</button>
                </div>
              </div>
            )}
          </Section>

          <Section
            title="Items"
            accent="border-admin-green"
            action={<button onClick={() => setItemsEditing((v) => !v)} type="button" className="text-secondary text-sm font-medium hover:underline no-print">{itemsEditing ? 'Cancel' : 'Edit Items'}</button>}
          >
            {poleTentSurfaceIssue && (
              <div className="mb-3 rounded border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                ⚠ {poleTentSurfaceIssue}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-100 rounded overflow-hidden">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="py-2.5 px-3 text-left font-semibold text-dark w-1/2">Item</th>
                    <th className="py-2.5 px-3 text-right font-semibold text-dark">Qty</th>
                    <th className="py-2.5 px-3 text-right font-semibold text-dark">Rate</th>
                    <th className="py-2.5 px-3 text-right font-semibold text-dark">Total</th>
                    {itemsEditing && <th className="py-2.5 px-3 text-right font-semibold text-dark no-print">Remove</th>}
                  </tr>
                </thead>
                <tbody>
                  {editItems.map((item, idx) => (
                    <tr key={idx} className={'border-b border-gray-100 hover:bg-blue-50/60 transition-colors ' + (idx % 2 === 1 ? 'bg-gray-50/50' : '')}>
                      <td className="py-2.5 px-3 text-[14px] text-dark">{item.itemName}</td>
                      <td className="py-2.5 px-3 text-right">
                        {itemsEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => updateItemRow(idx, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-16 border border-gray-300 rounded px-2 py-1 text-right text-sm no-print"
                          />
                        ) : (
                          <span>{item.quantity}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {itemsEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItemRow(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-24 border border-gray-300 rounded px-2 py-1 text-right text-sm no-print"
                          />
                        ) : (
                          <span>{formatCurrency(item.unitPrice)}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium tabular-nums">{formatCurrency(item.quantity * item.unitPrice)}</td>
                      {itemsEditing && (
                        <td className="py-2.5 px-3 text-right no-print">
                          <button onClick={() => removeItemRow(idx)} type="button" className="text-red-600 text-xs font-medium hover:underline">Remove</button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {editItems.length === 0 && (
                    <tr><td colSpan={itemsEditing ? 5 : 4} className="py-3 text-center text-body text-sm">No items on this order</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {itemsEditing && (
              <div className="mt-4 border border-gray-200 rounded p-4 no-print bg-gray-50/50">
                <p className="text-sm font-medium mb-1">Add Item</p>
                <p className="text-xs text-body mb-2">Type to search {catalog.length} catalog items by name or category, or enter a custom item and price.</p>
                <div className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-12 md:col-span-6 relative">
                    <input
                      placeholder="Search or type item name..."
                      value={newItemName}
                      onChange={(e) => { setNewItemName(e.target.value); setNewItemCatalogId(''); setCatalogOpen(true) }}
                      onFocus={() => setCatalogOpen(true)}
                      onBlur={() => setTimeout(() => setCatalogOpen(false), 150)}
                      className="w-full border border-gray-300 rounded px-2 py-2 text-sm"
                    />
                    {catalogOpen && filteredCatalog.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg max-h-64 overflow-y-auto">
                        {filteredCatalog.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); selectCatalogItem(c.id) }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-gray-50 flex justify-between gap-2"
                          >
                            <span>{c.category?.name && <span className="text-xs text-body mr-1">[{c.category.name}]</span>}{c.name}</span>
                            <span className="text-body whitespace-nowrap">{formatCurrency(c.cost)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {catalogOpen && catalogQuery && filteredCatalog.length === 0 && (
                      <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg px-3 py-2 text-sm text-body">No catalog matches — this will be added as a custom item.</div>
                    )}
                  </div>
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(e.target.value)}
                    className="col-span-4 md:col-span-2 border border-gray-300 rounded px-2 py-2 text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Unit Price"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="col-span-4 md:col-span-2 border border-gray-300 rounded px-2 py-2 text-sm"
                  />
                  <button onClick={addItemRow} type="button" className="col-span-4 md:col-span-2 btn-admin text-sm">Add Item</button>
                </div>
              </div>
            )}

            <div className="mt-3 flex justify-between text-sm text-body">
              <span>{editItems.length} item{editItems.length === 1 ? '' : 's'}</span>
              <span className="font-medium text-dark">Items Subtotal: {formatCurrency(liveTotals.subtotal)}</span>
            </div>

            {itemsEditing && (
              <div className="flex gap-2 mt-4 no-print">
                <button onClick={() => saveItems(false)} disabled={savingItems} type="button" className="btn-admin">
                  {savingItems ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={() => saveItems(true)} disabled={savingItems} type="button" className="btn-outline">
                  {savingItems ? 'Saving...' : 'Save & Send Updated Receipt'}
                </button>
                <button onClick={() => setItemsEditing(false)} type="button" className="btn-outline">Cancel</button>
              </div>
            )}
          </Section>

          <Section title="Payment History" accent="border-accent" action={<button onClick={() => setAddPaymentOpen((v) => !v)} type="button" className="text-secondary text-sm font-medium hover:underline no-print">{addPaymentOpen ? 'Cancel' : 'Add Manual Payment'}</button>}><div className="mb-4 no-print rounded-lg border border-gray-200 bg-gray-50/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-dark">Card on file</p>
                  <p className="text-xs text-body">
                    {order.stripeCustomerId && order.savedPaymentMethodId
                      ? (order.cardOnFileConsentAt && order.cardOnFileConsentVersion
                          ? 'Payment method saved with Stripe · post-rental authorization recorded.'
                          : 'Payment method saved with Stripe · new-fee authorization not yet recorded.')
                      : 'No payment method is currently saved for this order.'}
                  </p>
                </div>
                {order.stripeCustomerId && order.savedPaymentMethodId && (
                  <button onClick={() => {
                    if (!chargeCardOpen && !chargeCardAmount) {
                      const balance = Math.max(Math.round((order.totalAmount - order.amountPaid) * 100) / 100, 0)
                      setChargeCardAmount(balance > 0 ? balance.toFixed(2) : '')
                      setChargeCardReason(balance > 0 ? 'Outstanding rental balance' : '')
                      setChargeCardAddsToTotal(balance === 0)
                    }
                    setChargeCardOpen(v => !v)
                  }} type="button" className="text-secondary text-sm font-semibold">
                    {chargeCardOpen ? 'Close charge panel' : 'Charge Card on File'}
                  </button>
                )}
              </div>

              {chargeCardOpen && order.stripeCustomerId && order.savedPaymentMethodId && (
                <div className="mt-4 space-y-4 border-t border-gray-200 pt-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="flex items-start gap-2 rounded-lg border bg-white p-3 text-sm">
                      <input className="mt-1" type="radio" name="nyc-card-purpose" checked={!chargeCardAddsToTotal} onChange={() => {
                        const balance = Math.max(Math.round((order.totalAmount - order.amountPaid) * 100) / 100, 0)
                        setChargeCardAddsToTotal(false)
                        setChargeCardAmount(balance > 0 ? balance.toFixed(2) : '')
                        setChargeCardReason('Outstanding rental balance')
                      }} />
                      <span><strong>Existing unpaid balance</strong><span className="block text-body">{formatCurrency(Math.max(order.totalAmount - order.amountPaid, 0))} remaining. Does not add a fee.</span></span>
                    </label>
                    <label className="flex items-start gap-2 rounded-lg border bg-white p-3 text-sm">
                      <input className="mt-1" type="radio" name="nyc-card-purpose" checked={chargeCardAddsToTotal} onChange={() => {
                        setChargeCardAddsToTotal(true)
                        setChargeCardAmount('')
                        setChargeCardReason('')
                      }} />
                      <span><strong>New documented fee</strong><span className="block text-body">Damage, missing item, cleaning, late fee, or another allowed charge.</span></span>
                    </label>
                  </div>

                  {chargeCardAddsToTotal && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Charge type</label>
                      <select value={chargeCardType} onChange={e => setChargeCardType(e.target.value)} className="w-full sm:w-auto border rounded px-3 py-2 text-sm">
                        <option value="damage">Damage</option>
                        <option value="missing_item">Missing item</option>
                        <option value="unreturned_item">Unreturned item</option>
                        <option value="cleaning">Cleaning</option>
                        <option value="late_fee">Late / extra fee</option>
                        <option value="other">Other documented charge</option>
                      </select>
                      {(!order.cardOnFileConsentAt || !order.cardOnFileConsentVersion) && (
                        <p className="mt-2 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                          Customer authorization is required before charging a new fee. Create the authorization link below and have the customer complete it first.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid sm:grid-cols-[10rem_1fr] gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Amount ($)</label>
                      <input type="number" min="0.01" step="0.01" value={chargeCardAmount} onChange={e => setChargeCardAmount(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Reason / documentation</label>
                      <input type="text" value={chargeCardReason} onChange={e => setChargeCardReason(e.target.value)} placeholder="Describe the balance or rental issue" className="w-full border rounded px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <button onClick={chargeSavedCard} disabled={chargingCard || (chargeCardAddsToTotal && (!order.cardOnFileConsentAt || !order.cardOnFileConsentVersion))} type="button" className="btn-admin disabled:opacity-50">
                    {chargingCard ? 'Checking payment…' : chargeCardAddsToTotal ? 'Review New Fee & Charge Card' : 'Review & Collect Balance'}
                  </button>
                </div>
              )}

              <div className="mt-4 border-t border-gray-200 pt-3">
                <CardSetupLink orderId={id} />
                <button type="button" disabled={refreshingCard} className="text-xs font-semibold text-secondary disabled:opacity-50" onClick={async () => {
                  setRefreshingCard(true)
                  try {
                    const response = await fetch('/api/admin/orders/' + id)
                    if (!response.ok) throw new Error('Could not refresh card status')
                    setOrder((await response.json()).order)
                    toast.success('Saved payment method status refreshed')
                  } catch {
                    toast.error('Could not refresh the card status')
                  } finally {
                    setRefreshingCard(false)
                  }
                }}>{refreshingCard ? 'Refreshing…' : 'Refresh Card Status'}</button>
              </div>
            </div>
            {order.payments.length === 0 && <p className="text-sm text-body">No payments recorded yet.</p>}
            <div className="divide-y divide-gray-100">
              {order.payments.map((p) => {
                const isRefund = p.amount < 0
      const paymentLabel = isRefund ? 'Refund' : (p.stripePaymentId ? 'Card' : 'Manual Payment')
      const sourceInfo = p.stripePaymentId
      ? { text: 'Processed via Stripe', title: 'Real Stripe payment - this money is in your account', cls: 'text-green-700 font-medium' }
        : p.recordedByName
      ? { text: 'Manual entry by ' + p.recordedByName, title: 'Recorded manually by staff - not an automatic Stripe charge', cls: 'text-amber-600 font-medium' }
        : { text: 'Imported payment record', title: 'Historical payment record without a linked Stripe charge or staff name', cls: 'text-amber-600 font-medium' }
                return (
                  <div key={p.id} className="flex justify-between items-center text-sm py-3">
                    <div>
                      <p className="font-medium text-dark">{formatDateTime(p.createdAt)} · {paymentLabel}</p>
<p className="text-xs text-body mt-0.5">
{p.notes && <span className="italic mr-2" title="Internal note">{p.notes}</span>}
<span className={sourceInfo.cls} title={sourceInfo.title}>{sourceInfo.text}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={'font-semibold tabular-nums ' + (isRefund ? 'text-red-600' : 'text-dark')}>{isRefund ? '−' : ''}{formatCurrency(Math.abs(p.amount))}</span>
                      <div className="relative no-print">
                        <button onClick={() => setPaymentMenuOpenId(paymentMenuOpenId === p.id ? null : p.id)} type="button" className="text-body hover:text-dark px-1">⋯</button>
                        {paymentMenuOpenId === p.id && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setPaymentMenuOpenId(null)} />
                            <div className="absolute z-30 right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-sm">
                              {p.stripePaymentId && !p.stripePaymentId.startsWith('simulated_') && p.amount > 0 && (
                                <button onClick={() => { setPaymentMenuOpenId(null); refundPayment(p.id, p.amount) }} type="button" className="block w-full text-left px-3 py-2 hover:bg-orange-50 text-orange-700">Refund payment</button>
                              )}
                              {!p.stripePaymentId && (
                            <button onClick={() => { setPaymentMenuOpenId(null); removePayment(p.id) }} type="button" className="block w-full text-left px-3 py-2 hover:bg-red-50 text-red-600">Remove manual entry</button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {!!order.additionalCharges?.length && (
              <div className="mt-4 rounded-lg border border-gray-200 p-3 no-print">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Saved-card charge attempts</p>
                <div className="mt-2 space-y-2">
                  {order.additionalCharges.slice(0, 8).map(charge => (
                    <div key={charge.id} className="flex flex-wrap items-start justify-between gap-2 text-xs">
                      <div>
                        <strong className="text-dark">{charge.type.replace(/_/g, ' ')}</strong> · {charge.reason}
                        {charge.failureMessage && <span className="block text-red-700">{charge.failureMessage}</span>}
                      </div>
                      <span className="font-semibold">{formatCurrency(charge.amount)} · {charge.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {addPaymentOpen && (
              <div className="mt-3 border border-gray-200 rounded p-4 no-print bg-gray-50/50">
                <p className="text-sm font-medium mb-2">Add Manual Payment</p>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="number"
                    placeholder="Amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm w-32"
                  />
                  <input type="text" placeholder="Reason / note (required)" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm flex-1 min-w-[240px]" />
<select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="border border-gray-300 rounded px-2 py-2 text-sm">
<option value="cash">Cash</option>
<option value="check">Check</option>
<option value="card">Card (charged outside this system)</option>
<option value="other">Other</option>
</select>
                  <label className="flex items-center gap-1 text-xs text-gray-600"><input type="checkbox" checked={paymentSkipEmail} onChange={(e) => setPaymentSkipEmail(e.target.checked)} /> Skip email</label>
                  <button onClick={addPayment} type="button" className="btn-admin text-sm">Save Payment</button>
                </div>
              </div>
            )}
          </Section>

          <Section title="Notes" accent="border-gray-400">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium">Internal Notes</label>
                  <button onClick={() => setInternalNotesEditing((v) => !v)} type="button" className="text-secondary text-xs font-medium hover:underline no-print">{internalNotesEditing ? 'Cancel' : 'Edit'}</button>
                </div>
                {internalNotesEditing ? (
                  <>
                    <textarea
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                    <button onClick={() => { saveOrder(); setInternalNotesEditing(false) }} type="button" className="btn-admin text-sm mt-2">Save</button>
                  </>
                ) : (
                  <p className="text-sm text-body whitespace-pre-wrap min-h-[1.5rem]">{internalNotes || 'No internal notes.'}</p>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium">Customer Notes</label>
                  <button onClick={() => setCustomerNotesEditing((v) => !v)} type="button" className="text-secondary text-xs font-medium hover:underline no-print">{customerNotesEditing ? 'Cancel' : 'Edit'}</button>
                </div>
                {customerNotesEditing ? (
                  <>
                    <textarea
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                    <button onClick={() => { saveOrder(); setCustomerNotesEditing(false) }} type="button" className="btn-admin text-sm mt-2">Save</button>
                  </>
                ) : (
                  <p className="text-sm text-body whitespace-pre-wrap min-h-[1.5rem]">{customerNotes || 'No customer notes.'}</p>
                )}
              </div>
            </div>
          </Section>

          <div className="space-y-3 no-print">
            <Advanced title="Communications" subtitle="Automated email controls for this order" open={communicationsOpen} onToggle={() => setCommunicationsOpen((v) => !v)}>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={followUpsPaused} onChange={(e) => setFollowUpsPaused(e.target.checked)} />
                  Pause automated quote follow-up emails for this order
                </label>
                <p className="text-xs text-gray-500 -mt-2">Use this if the customer already replied or you don't want further reminder emails sent.</p>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={prePayReminderDisabled} onChange={(e) => setPrePayReminderDisabled(e.target.checked)} />
                  Disable automatic 3-day Pre-Payment Reminder email for this order
                </label>
                <button onClick={saveOrder} type="button" className="btn-admin text-sm">Save</button>
              </div>
            </Advanced>

            <Advanced
              title="Billing Overrides"
              subtitle={hasBillingOverrides ? 'This order has manual discounts, fees, or overrides applied' : 'Discounts, manual fees and overrides — none applied'}
              open={billingOpen}
              onToggle={() => setBillingOpen((v) => !v)}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Location Name</label>
                  <input
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="e.g. Jones Backyard, Skyline Event Center"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">General Discount ($)</label>
                    <input type="number" step="0.01" value={generalDiscount} onChange={(e) => setGeneralDiscount(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Miscellaneous Fees ($)</label>
                    <input type="number" step="0.01" value={miscellaneousFees} onChange={(e) => setMiscellaneousFees(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Override Tax Amount ($)</label>
                    <input type="number" step="0.01" placeholder="Leave blank to use calculated tax" value={overrideTaxAmount} onChange={(e) => setOverrideTaxAmount(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Override Damage Waiver ($)</label>
                    <input type="number" step="0.01" placeholder="Leave blank to use calculated damage waiver" value={overrideDamageWaiverFee} onChange={(e) => setOverrideDamageWaiverFee(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Override Deposit Amount ($)</label>
                    <input type="number" step="0.01" placeholder="Leave blank to use calculated deposit" value={overrideDepositAmount} onChange={(e) => setOverrideDepositAmount(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                  </div>
                </div>
                <button onClick={saveOrder} type="button" className="btn-admin text-sm">Save Billing Changes</button>
              </div>
            </Advanced>

            <Advanced
              title="Raincheck"
              subtitle={hasRaincheckApplied ? (formatCurrency(order.raincheckApplied || 0) + ' applied to this order') : 'No raincheck applied to this order'}
              open={raincheckOpen}
              onToggle={() => setRaincheckOpen((v) => !v)}
            >
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Customer's Rainchecks</label>
                    <select value={selectedRaincheckId} onChange={(e) => setSelectedRaincheckId(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                      <option value="">-- Select a raincheck --</option>
                      {customerRainchecks.map((rc: any) => (
                        <option key={rc.id} value={rc.id}>{formatCurrency(rc.remainingAmount)} remaining of {formatCurrency(rc.amount)}{rc.reason ? ' - ' + rc.reason : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Amount to Apply ($)</label>
                    <input type="number" step="0.01" value={raincheckAmountInput} onChange={(e) => setRaincheckAmountInput(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                  </div>
                </div>
                <button onClick={applyRaincheck} disabled={applyingRaincheck} type="button" className="btn-admin text-sm">Apply Raincheck</button>
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-sm font-medium mb-2">Issue a new raincheck for this customer</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Amount ($)</label>
                      <input type="number" step="0.01" value={newRaincheckAmount} onChange={(e) => setNewRaincheckAmount(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Reason (optional)</label>
                      <input type="text" value={newRaincheckReason} onChange={(e) => setNewRaincheckReason(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <button onClick={issueRaincheck} disabled={issuingRaincheck} type="button" className="btn-admin text-sm mt-2">Issue Raincheck</button>
                </div>
              </div>
            </Advanced>

            <Advanced
              title="Additional Details"
              subtitle={hasAdditionalDetails ? 'Setup surface, park status and referral source on file' : 'Setup surface, park status and referral source'}
              open={detailsOpen}
              onToggle={() => setDetailsOpen((v) => !v)}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm">
                    <option value="active">Active</option>
                    <option value="incomplete">Incomplete</option>
                    <option value="quote">Quote</option>
                    <option value="canceled">Canceled</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Setup Surface</label>
                  <select value={setupSurface} onChange={(e) => setSetupSurface(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                    <option value="">-- Select --</option>
                    {setupSurfaceOptions.map((s) => (<option key={s.id} value={s.name}>{s.name}</option>))}
                  </select>
                </div>
                {poleTentSurfaceIssue && (
                  <div className="rounded border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                    ⚠ {poleTentSurfaceIssue}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">Is this event at a public park?</label>
                  <select value={isPublicPark ? 'yes' : 'no'} onChange={(e) => setIsPublicPark(e.target.value === 'yes')} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                    <option value="no">No</option>
                    <option value="yes">Yes - customer must provide/rent a generator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reference (how did they hear about us?)</label>
                  <select value={referenceSource} onChange={(e) => setReferenceSource(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                    <option value="">-- Select --</option>
                    {referenceOptions.map((r) => (<option key={r.id} value={r.name}>{r.name}</option>))}
                  </select>
                </div>
                <button onClick={saveOrder} type="button" className="btn-admin text-sm">Save Changes</button>
              </div>
            </Advanced>

            <Advanced title="Danger Zone" subtitle="Cancel or permanently delete this order" open={dangerOpen} onToggle={() => setDangerOpen((v) => !v)} danger>
              <div className="flex flex-wrap gap-2">
                {order.status !== 'canceled' && (
                  <button onClick={cancelOrder} disabled={cancelling} type="button" className="btn-outline !border-amber-300 !text-amber-700 hover:!bg-amber-50">
                    {cancelling ? 'Cancelling...' : 'Cancel Order'}
                  </button>
                )}
                <button onClick={deleteOrder} disabled={deleting} type="button" className="btn-danger-outline">
                  {deleting ? 'Deleting...' : 'Delete Order'}
                </button>
              </div>
            </Advanced>
          </div>
        </div>

        <div className="space-y-6 lg:sticky lg:top-4">
<Section title="Customer" action={<button onClick={() => setCustomerEditOpen((v) => !v)} type="button" className="text-secondary text-sm font-medium hover:underline no-print">{customerEditOpen ? 'Cancel' : 'Edit'}</button>}>
{!customerEditOpen ? (
<>
<p className="text-sm font-medium text-dark">{order.customer.firstName} {order.customer.lastName}</p>
{order.contractSignatureName && order.contractSignatureName.trim().toLowerCase() !== (order.customer.firstName + ' ' + order.customer.lastName).trim().toLowerCase() && (
<p className="text-xs text-body mt-0.5 italic">Contract signed as "{order.contractSignatureName}"</p>
)}
<p className="text-sm mt-1 break-words"><a href={'mailto:' + order.customer.email} className="text-secondary hover:underline">{order.customer.email}</a></p>
{order.customer.phone && <p className="text-sm mt-0.5"><a href={'tel:' + order.customer.phone} className="text-secondary hover:underline">{formatPhoneDisplay(order.customer.phone)}</a></p>}
{(customerSecondaryPhone || customerSecondaryEmail) && (
<div className="mt-2 pt-2 border-t border-gray-100">
<p className="text-xs font-semibold uppercase tracking-wide text-body">Secondary Contact</p>
{customerSecondaryEmail && <p className="text-sm mt-0.5"><a href={'mailto:' + customerSecondaryEmail} className="text-secondary hover:underline">{customerSecondaryEmail}</a></p>}
{customerSecondaryPhone && <p className="text-sm mt-0.5"><a href={'tel:' + customerSecondaryPhone} className="text-secondary hover:underline">{formatPhoneDisplay(customerSecondaryPhone)}</a></p>}
</div>
)}
{orderContacts.length > 0 && (
<div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
{orderContacts.map((c) => (
<p key={c.id} className="text-xs text-body"><span className="font-semibold text-dark">{c.role}:</span> {c.name}{c.phone ? ' - ' + formatPhoneDisplay(c.phone) : ''}{c.email ? ' - ' + c.email : ''}</p>
))}
</div>
)}
<div className="flex items-center gap-3 mt-3 no-print">
<button onClick={() => setContactsOpen(true)} type="button" className="text-secondary text-xs font-medium hover:underline">Manage Contacts</button>
{order.customerId && <a href={'/admin/customers/' + order.customerId} className="text-secondary text-xs font-medium hover:underline">View full profile →</a>}
</div>
</>
) : (
<div className="space-y-3 no-print">
<p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">Editing this customer updates their contact information across their customer profile and any other orders they have.</p>
<div className="grid grid-cols-2 gap-2">
<div>
<label className="block text-xs text-body mb-1">First Name</label>
<input type="text" value={customerFirstName} onChange={(e) => setCustomerFirstName(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
</div>
<div>
<label className="block text-xs text-body mb-1">Last Name</label>
<input type="text" value={customerLastName} onChange={(e) => setCustomerLastName(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
</div>
</div>
<div>
<label className="block text-xs text-body mb-1">Email</label>
<input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
</div>
<div>
<label className="block text-xs text-body mb-1">Phone</label>
<input type="text" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
</div>
<div className="grid grid-cols-2 gap-2">
<div>
<label className="block text-xs text-body mb-1">Secondary Phone</label>
<input type="text" value={customerSecondaryPhone} onChange={(e) => setCustomerSecondaryPhone(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
</div>
<div>
<label className="block text-xs text-body mb-1">Secondary Email</label>
<input type="email" value={customerSecondaryEmail} onChange={(e) => setCustomerSecondaryEmail(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
</div>
</div>
<div className="flex gap-2">
<button onClick={saveCustomerEdit} disabled={savingCustomer} type="button" className="btn-admin text-sm">{savingCustomer ? 'Saving...' : 'Save'}</button>
<button onClick={() => setCustomerEditOpen(false)} type="button" className="btn-outline text-sm">Cancel</button>
</div>
</div>
)}
</Section>

          <Section title="Event">
            <p className="text-sm font-semibold text-dark">{formatDate(order.eventDate)}{order.eventEndDate ? (' - ' + formatDate(order.eventEndDate)) : ''}</p>
            {order.locationName && <p className="text-sm mt-1">{order.locationName}</p>}
            <p className="text-sm text-body mt-1">{order.eventAddress}</p>
            <p className="text-sm text-body">{order.eventCity}, {order.eventState} {order.eventZip}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="badge bg-blue-50 text-secondary border border-blue-200">{deliveryTypeLabel}</span>
              {order.durationLabel && <span className="badge bg-gray-100 text-dark border border-gray-200">{order.durationLabel}</span>}
            </div>
          </Section>

          <Section title="Financial Summary">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-body">Subtotal</span><span className="tabular-nums">{formatCurrency(liveTotals.subtotal)}</span></div>
              {!!order.durationFee && (
                <div className="flex justify-between"><span className="text-body">Multi-Day Fee{order.durationLabel ? (' (' + order.durationLabel + ')') : ''}</span><span className="tabular-nums">{formatCurrency(order.durationFee || 0)}</span></div>
              )}
              {!!order.specialRequestFee && (
                <div className="flex justify-between"><span className="text-body">Special Requests</span><span className="tabular-nums">{formatCurrency(order.specialRequestFee || 0)}</span></div>
              )}
              {!!order.couponCode && (
                <div className="flex justify-between text-green-700"><span>Coupon ({order.couponCode})</span><span className="tabular-nums">-{formatCurrency(order.couponDiscount || 0)}</span></div>
              )}
              {parseFloat(generalDiscount) > 0 && (
                <div className="flex justify-between text-green-700"><span>General Discount</span><span className="tabular-nums">-{formatCurrency(parseFloat(generalDiscount) || 0)}</span></div>
              )}
              {(!!order.damageWaiver || (order.damageWaiverFee ?? 0) > 0 || overrideDamageWaiverFee !== '') && (
                <div className="flex justify-between"><span className="text-body">Damage Waiver{overrideDamageWaiverFee !== '' ? ' (override)' : ''}</span><span className="tabular-nums">{formatCurrency(liveTotals.damageWaiverFee || 0)}</span></div>
              )}
              {order.deliveryType === 'delivery' && (
                <div className="border-y border-gray-100 py-2 my-2 no-print">
                  <label className="block text-xs font-semibold text-dark mb-1">Delivery Fee ($)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={overrideTravelFee}
                      onChange={(e) => setOverrideTravelFee(e.target.value)}
                      placeholder={(order.deliveryFee || 0).toFixed(2)}
                      className="min-w-0 flex-1 rounded border border-gray-300 px-2.5 py-2 text-sm"
                    />
                    <button onClick={saveOrder} type="button" className="btn-admin whitespace-nowrap text-xs">Save Fee</button>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">Type the exact delivery fee you want. The order total and tax update with it.</p>
                </div>
              )}
              {order.deliveryType === 'delivery' && (
                <div className="hidden print:flex justify-between"><span>Delivery Fee</span><span>{formatCurrency(liveTotals.deliveryFee || 0)}</span></div>
              )}
              {parseFloat(miscellaneousFees) > 0 && (
                <div className="flex justify-between"><span className="text-body">Miscellaneous Fees</span><span className="tabular-nums">{formatCurrency(parseFloat(miscellaneousFees) || 0)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-body">Sales Tax{order.taxRate ? (' (' + order.taxRate + '%)') : ''}{overrideTaxAmount !== '' ? ' (override)' : ''}</span><span className="tabular-nums">{formatCurrency(liveTotals.taxAmount)}</span></div>
              <div className="flex justify-between font-bold border-t border-gray-200 pt-1.5 mt-1.5"><span>Total</span><span className="tabular-nums">{formatCurrency(liveTotals.totalAmount)}</span></div>
              <div className="flex justify-between"><span className="text-body">Paid</span><span className="tabular-nums">{formatCurrency(order.amountPaid)}</span></div>
              <div className={'flex justify-between font-bold ' + (liveTotals.balanceDue > 0 ? 'text-amber-600' : 'text-green-700')}>
                <span>Balance</span><span className="tabular-nums">{formatCurrency(liveTotals.balanceDue)}</span>
              </div>
            </div>
            <div className={'mt-3 text-center text-xs font-semibold rounded py-1.5 ' + (liveTotals.balanceDue > 0 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700')}>
              {liveTotals.balanceDue > 0 ? formatCurrency(liveTotals.balanceDue) + ' Due' : liveTotals.balanceDue < 0 ? 'Overpaid by ' + formatCurrency(Math.abs(liveTotals.balanceDue)) : 'PAID IN FULL'}
            </div>
          </Section>

          <Section title="Schedule Eligibility">
            <div className={'flex items-center gap-2 text-sm font-semibold ' + (onSchedule ? 'text-green-700' : 'text-body')}>
              <span>{onSchedule ? '✓' : '—'}</span>
              <span>{onSchedule ? 'On Schedule' : 'Not on Schedule'}</span>
            </div>
            <p className="text-xs text-body mt-1">{scheduleReason}</p>
            {noPaymentYet && (
              <div className="mt-3 no-print">
                <label className="flex items-center gap-2 text-xs text-body">
                  <input type="checkbox" checked={scheduleApprovedUnpaid} onChange={(e) => setScheduleApprovedUnpaid(e.target.checked)} />
                  Approve this unpaid order to appear on the schedule
                </label>
                <button onClick={saveOrder} type="button" className="btn-outline text-xs mt-2">Save</button>
              </div>
            )}
          </Section>
        </div>
      </div>
    {contactsOpen && (
<>
<div className="fixed inset-0 bg-black/40 z-40 no-print" onClick={() => { setContactsOpen(false); setContactFormOpen(false); resetContactForm() }} />
<div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white shadow-xl overflow-y-auto no-print">
<div className="p-5">
<div className="flex items-center justify-between mb-4">
<h2 className="text-lg font-semibold text-dark">Manage Contacts</h2>
<button onClick={() => { setContactsOpen(false); setContactFormOpen(false); resetContactForm() }} type="button" className="text-body hover:text-dark">Close</button>
</div>

<div className="mb-4 pb-4 border-b border-gray-100">
<p className="text-xs font-semibold uppercase tracking-wide text-body mb-2">Customer Profile</p>
<p className="text-sm font-medium text-dark">{order.customer.firstName} {order.customer.lastName} (Primary)</p>
<p className="text-sm text-body">{order.customer.email}</p>
{order.customer.phone && <p className="text-sm text-body">{formatPhoneDisplay(order.customer.phone)}</p>}
</div>

<div className="mb-4 pb-4 border-b border-gray-100">
<p className="text-xs font-semibold uppercase tracking-wide text-body mb-2">This Order Only</p>
{orderContacts.length === 0 && <p className="text-sm text-body">No additional contacts on this order.</p>}
<div className="space-y-3">
{orderContacts.map((c) => (
<div key={c.id} className="border border-gray-200 rounded-lg p-3">
<div className="flex items-center justify-between">
<p className="text-sm font-medium text-dark">{c.name}</p>
<span className="text-xs text-body">{c.role}</span>
</div>
{c.phone && <p className="text-xs text-body mt-0.5">{formatPhoneDisplay(c.phone)}</p>}
{c.email && <p className="text-xs text-body mt-0.5">{c.email}</p>}
{c.note && <p className="text-xs text-body italic mt-1">{c.note}</p>}
<div className="flex gap-3 mt-2">
<button onClick={() => startEditContact(c)} type="button" className="text-secondary text-xs font-medium hover:underline">Edit</button>
<button onClick={() => removeContact(c.id)} type="button" className="text-red-600 text-xs font-medium hover:underline">Remove</button>
</div>
</div>
))}
</div>
</div>

{!contactFormOpen ? (
<button onClick={() => { resetContactForm(); setContactFormOpen(true) }} type="button" className="btn-outline text-sm w-full">+ Add Contact</button>
) : (
<div className="border border-gray-200 rounded-lg p-3 space-y-3">
<p className="text-sm font-medium">{contactEditingId ? 'Edit Contact (this order only)' : 'Add Contact'}</p>{!contactEditingId && (<div><label className="block text-xs text-body mb-1">Applies To</label><select value={contactScope} onChange={(e) => setContactScope(e.target.value as 'order' | 'profile')} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"><option value="order">This Order Only</option><option value="profile">Customer Profile (all future orders)</option></select>{contactScope === 'profile' && (<p className="text-xs text-body mt-1">Only Phone and Email are saved to the customer profile for future orders. Name, Role, and Note only apply to order-only contacts and are ignored here.</p>)}</div>)}
<div>
<label className="block text-xs text-body mb-1">Name</label>
<input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
</div>
<div>
<label className="block text-xs text-body mb-1">Role</label>
<select value={contactRole} onChange={(e) => setContactRole(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
<option value="Day-Of">Day-Of Contact</option>
<option value="Secondary">Secondary Contact</option>
<option value="Billing">Billing Contact</option>
<option value="Delivery">Delivery Contact</option>
<option value="Other">Other</option>
</select>
</div>
<div>
<label className="block text-xs text-body mb-1">Phone</label>
<input type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
</div>
<div>
<label className="block text-xs text-body mb-1">Email</label>
<input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
</div>
<div>
<label className="block text-xs text-body mb-1">Note (optional)</label>
<input type="text" placeholder="e.g. Call when truck is 20 minutes away" value={contactNote} onChange={(e) => setContactNote(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
</div>
<div className="flex gap-2">
<button onClick={saveContact} disabled={savingContact} type="button" className="btn-admin text-sm">{savingContact ? 'Saving...' : 'Save Contact'}</button>
<button onClick={() => { setContactFormOpen(false); resetContactForm() }} type="button" className="btn-outline text-sm">Cancel</button>
</div>
</div>
)}
</div>
</div>
</>
)}

{receiptRecipientsOpen && (
<>
<div className="fixed inset-0 bg-black/40 z-40 no-print" onClick={() => setReceiptRecipientsOpen(false)} />
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
<div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
<h2 className="text-lg font-semibold text-dark mb-3">{order && order.amountPaid > 0 ? 'Send Updated Receipt' : 'Send Quote'}</h2>
<p className="text-xs text-body mb-3">Choose who should receive this {order && order.amountPaid > 0 ? 'receipt' : 'quote'}.</p>
<div className="space-y-2 mb-4">
{receiptRecipients.map((r, idx) => (
<label key={idx} className="flex items-center gap-2 text-sm">
<input type="checkbox" checked={r.checked} onChange={(e) => setReceiptRecipients((prev) => prev.map((x, i) => i === idx ? { ...x, checked: e.target.checked } : x))} />
<span>{r.label} - {r.email}</span>
</label>
))}
</div>
<div className="flex gap-2">
<button onClick={sendReceiptToSelectedRecipients} disabled={sendingQuote} type="button" className="btn-admin text-sm">{sendingQuote ? 'Sending...' : (order && order.amountPaid > 0 ? 'Send Receipt' : 'Send Quote')}</button>
<button onClick={() => setReceiptRecipientsOpen(false)} type="button" className="btn-outline text-sm">Cancel</button>
</div>
</div>
</div>
</>
)}
</div>
  )
}
