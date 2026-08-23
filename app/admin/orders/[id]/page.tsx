'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate } from '@/lib/utils'

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
internalNotes?: string
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
createdAt: string
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
'Afternoon (12pm - 7pm)',
'Evening Drop-off (4pm - 8pm)',
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

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
const router = useRouter()
const [syncing, setSyncing] = useState(false)
const [order, setOrder] = useState<OrderDetail | null>(null)
const [status, setStatus] = useState('')
const [internalNotes, setInternalNotes] = useState('')
const [customerNotes, setCustomerNotes] = useState('')
const [setupSurface, setSetupSurface] = useState('')
const [isPublicPark, setIsPublicPark] = useState(false)
const [referenceSource, setReferenceSource] = useState('')
const [setupSurfaceOptions, setSetupSurfaceOptions] = useState<{ id: string; name: string }[]>([])
const [referenceOptions, setReferenceOptions] = useState<{ id: string; name: string }[]>([])
const [paymentAmount, setPaymentAmount] = useState(''); const [paymentNotes, setPaymentNotes] = useState(''); const [paymentSkipEmail, setPaymentSkipEmail] = useState(true) // default to NOT emailing the customer on manual payment/refund entries; staff can opt in by unchecking
const [sendingQuote, setSendingQuote] = useState(false)
const [deleting, setDeleting] = useState(false)
const [sendingCancellation, setSendingCancellation] = useState(false)
const [prePayReminderDisabled, setPrePayReminderDisabled] = useState(false)
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

const loadOrder = () => {
fetch('/api/admin/orders/' + id)
.then((r) => r.json())
.then((d) => {
setOrder(d.order)
setStatus(d.order.status)
setInternalNotes(d.order.internalNotes || '')
setCustomerNotes(d.order.notes || '')
setSetupSurface(d.order.setupSurface || '')
setIsPublicPark(!!d.order.isPublicPark)
setReferenceSource(d.order.referenceSource || '')
setPrePayReminderDisabled(d.order.prePayReminderDisabled || false)
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
setEditDropoffSlot(d.order.eventTimeSlot || '')
setEditPickupSlot(d.order.pickupTimeSlot || '')
setEditEventAddress(d.order.eventAddress || '')
setEditEventCity(d.order.eventCity || '')
setEditEventZip(d.order.eventZip || '')
setEditEventState(d.order.eventState || '')
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
const totals = recalcTotals()
const res = await fetch('/api/admin/orders/' + id, {
method: 'PUT',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
  ...totals,
status,
internalNotes,
notes: customerNotes,
prePayReminderDisabled,
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
if (res.ok) toast.success('Order updated')
else toast.error('Failed to update')
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
body: JSON.stringify({ orderId: id, amount: paymentAmount, notes: paymentNotes, skipEmail: paymentSkipEmail }),
})
if (res.ok) {
toast.success('Payment recorded')
setPaymentAmount(''); setPaymentNotes(''); setPaymentSkipEmail(false)
const d = await fetch('/api/admin/orders/' + id).then((r) => r.json())
setOrder(d.order)
} else toast.error('Failed')
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
const balanceDue = Math.max(Math.round((totalAmount - (order?.amountPaid || 0) - raincheckAppliedVal) * 100) / 100, 0)
return { subtotal: editItemsSubtotal, taxAmount, totalAmount, balanceDue, deliveryFee, damageWaiverFee }
}

const saveItems = async (sendReceiptAfter: boolean) => {
if (!order) return
if (editItems.length === 0) {
toast.error('An order must have at least one item')
return
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
eventTimeSlot: editDropoffSlot,
pickupTimeSlot: editPickupSlot,
}),
})
if (!res.ok) throw new Error('Failed to save date/time')
loadOrder()
toast.success('Date & time updated')
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
} catch {
toast.error('Failed to save address changes')
} finally {
setSavingAddress(false)
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
const statusBadgeClass = status === 'active' ? 'badge badge-active' : status === 'quote' ? 'badge badge-quote' : status === 'canceled' ? 'badge badge-canceled' : 'badge badge-incomplete'
const statusLabel = order.status.charAt(0).toUpperCase() + order.status.slice(1)

return (
<div className="p-4 max-w-5xl mx-auto">
<style jsx global>{'.print-only { display: none; } @media print { nav { display: none !important; } .no-print { display: none !important; } main { padding-top: 0 !important; } body { background: white !important; } .print-only { display: inline !important; } }'}</style>

<Link href="/admin/orders" className="text-secondary text-sm hover:underline mb-4 block no-print">← Back to Orders</Link>

<div className="print-header hidden items-center justify-between border-b-2 border-gray-800 pb-4 mb-6">
<div>
<h1 className="text-2xl font-bold">Friendly Party Rental</h1>
<p className="text-sm">Syracuse, NY and surrounding Central New York areas</p>
</div>
<div className="text-right">
<h2 className="text-xl font-bold">RENTAL AGREEMENT</h2>
<p className="text-sm">Order #{order.orderNumber}</p>
<p className="text-sm">Date: {formatDate(order.eventDate)}</p>
</div>
</div>

<div className="mb-6 no-print">
<div className="flex items-center gap-3 mb-4">
<h1 className="text-2xl font-bold text-dark">Order {order.orderNumber}</h1>
<span className={statusBadgeClass}>{statusLabel}</span>
{order.balanceDue > 0 && (
<span className="badge bg-red-50 text-red-700 border border-red-200">Balance Due: {formatCurrency(order.balanceDue)}</span>
)}
</div>
<div className="flex flex-wrap gap-2">
<a href={'/pay/' + id} target="_blank" rel="noopener noreferrer" className="btn-admin inline-flex items-center">Open Payment Page</a>
<Link href={'/admin/orders/' + id + '/checkout'} className="btn-admin inline-flex items-center">Process Payment</Link>
<button onClick={sendQuoteEmail} disabled={sendingQuote} className="btn-admin disabled:opacity-50">
{sendingQuote ? 'Sending...' : order.amountPaid > 0 ? 'Send Updated Receipt' : 'Email Quote to Customer'}
</button>
<button onClick={syncWithStripe} disabled={syncing} className="btn-info disabled:opacity-50">{syncing ? 'Syncing...' : 'Sync with Stripe'}</button>
<button onClick={copyPaymentLink} className="btn-outline">Copy Payment Link</button>
<button onClick={copyContractLink} className="btn-outline">Copy Contract Link</button>
<a href={'/contract/' + id} target="_blank" rel="noopener noreferrer" className="btn-outline inline-flex items-center">View Contract</a>
<button onClick={() => window.print()} className="btn-outline">Print</button>
{order.status === 'canceled' && (
<button onClick={sendCancellationMessage} disabled={sendingCancellation} className="btn-outline">
{sendingCancellation ? 'Sending...' : 'Send Cancellation Message'}
</button>
)}
<button
onClick={deleteOrder}
disabled={deleting}
className="btn-danger-outline"
>
{deleting ? 'Deleting...' : 'Delete Order'}
</button>
</div>
</div>

<div className="grid md:grid-cols-2 gap-6 mb-6">
<div className="admin-card border-l-4 border-secondary !mb-0">
<h2 className="admin-card-header">Customer</h2>
<p className="text-sm">{order.customer.firstName} {order.customer.lastName}</p>
<p className="text-sm text-body">{order.customer.email}</p>
<p className="text-sm text-body">{order.customer.phone}</p>
</div>
<div className="admin-card border-l-4 border-secondary !mb-0">
<h2 className="admin-card-header">Event Details</h2>
<p className="text-sm font-semibold text-dark">{formatDate(order.eventDate)}{order.eventEndDate ? (' - ' + formatDate(order.eventEndDate)) : ''}</p>
{order.locationName && <p className="text-sm mt-1">{order.locationName}</p>}
<p className="text-sm text-body mt-1">{order.eventAddress}</p>
<p className="text-sm text-body">{order.eventCity}, {order.eventState} {order.eventZip}</p>
<div className="flex flex-wrap gap-2 mt-3">
<span className="badge bg-blue-50 text-secondary border border-blue-200">{deliveryTypeLabel}</span>
{order.durationLabel && <span className="badge bg-gray-100 text-dark border border-gray-200">{order.durationLabel}</span>}
</div>
</div>
</div>

<div className="admin-card border-l-4 border-admin-green">
<h2 className="admin-card-header">Drop-Off & Pickup Schedule</h2>
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
</div>
</div>
</div>

<div className="admin-card border-l-4 border-admin-green">
<h2 className="admin-card-header">Edit Date & Time</h2>
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
<select value={editPickupSlot} onChange={(e) => setEditPickupSlot(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2">
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
<button onClick={saveDateTime} disabled={savingDateTime} className="btn-admin">{savingDateTime ? 'Saving...' : 'Save Date & Time'}</button>
</div>

<div className="admin-card border-l-4 border-admin-green">
<h2 className="admin-card-header">Edit Delivery Address</h2>
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
<button onClick={saveAddress} disabled={savingAddress} className="btn-admin">{savingAddress ? 'Saving...' : 'Save Delivery Address'}</button>
</div>

<div className="admin-card border-l-4 border-admin-green">
<h2 className="admin-card-header">Items</h2>
<p className="text-xs text-body mb-3 no-print bg-blue-50 border border-blue-100 rounded px-3 py-2">Edit the Qty or Unit Price directly below, then click Save Item Changes. No need to remove and re-add an item just to change its quantity.</p>
<div className="overflow-x-auto">
<table className="w-full text-sm border border-gray-100 rounded overflow-hidden">
<thead>
<tr className="bg-gray-50 border-b border-gray-200">
<th className="py-2.5 px-3 text-left font-semibold text-dark">Item</th>
<th className="py-2.5 px-3 text-right font-semibold text-dark">Qty</th>
<th className="py-2.5 px-3 text-right font-semibold text-dark">Unit Price</th>
<th className="py-2.5 px-3 text-right font-semibold text-dark">Total</th>
<th className="py-2.5 px-3 text-right font-semibold text-dark no-print">Remove</th>
</tr>
</thead>
<tbody>
{editItems.map((item, idx) => (
<tr key={idx} className={'border-b border-gray-100 hover:bg-blue-50/60 transition-colors ' + (idx % 2 === 1 ? 'bg-gray-50/50' : '')}>
<td className="py-2.5 px-3">{item.itemName}</td>
<td className="py-2.5 px-3 text-right">
<input
type="number"
min="0"
value={item.quantity}
onChange={(e) => updateItemRow(idx, 'quantity', parseInt(e.target.value) || 0)}
className="w-16 border border-gray-300 rounded px-2 py-1 text-right text-sm no-print"
/>
<span className="print-only">{item.quantity}</span>
</td>
<td className="py-2.5 px-3 text-right">
<input
type="number"
min="0"
step="0.01"
value={item.unitPrice}
onChange={(e) => updateItemRow(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
className="w-24 border border-gray-300 rounded px-2 py-1 text-right text-sm no-print"
/>
<span className="print-only">{formatCurrency(item.unitPrice)}</span>
</td>
<td className="py-2.5 px-3 text-right font-medium">{formatCurrency(item.quantity * item.unitPrice)}</td>
<td className="py-2.5 px-3 text-right no-print">
<button onClick={() => removeItemRow(idx)} className="text-red-600 text-xs font-medium hover:underline">Remove</button>
</td>
</tr>
))}
{editItems.length === 0 && (
<tr><td colSpan={5} className="py-3 text-center text-body text-sm">No items on this order</td></tr>
)}
</tbody>
</table>
</div>

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
<button onClick={addItemRow} className="col-span-4 md:col-span-2 btn-admin text-sm">Add Item</button>
</div>
</div>

<div className="mt-4 space-y-1 text-sm max-w-xs ml-auto bg-gray-50 rounded p-3">
<div className="flex justify-between">
<span className="text-body">Subtotal</span>
<span>{formatCurrency(liveTotals.subtotal)}</span>
</div>
{!!order.durationFee && (
<div className="flex justify-between">
<span className="text-body">Multi-Day Rental Fee{order.durationLabel ? (' (' + order.durationLabel + ')') : ''}</span>
<span>{formatCurrency(order.durationFee || 0)}</span>
</div>
)}
{!!order.specialRequestFee && (
<div className="flex justify-between">
<span className="text-body">Special Requests{order.specialRequestNames ? (' (' + order.specialRequestNames + ')') : ''}</span>
<span>{formatCurrency(order.specialRequestFee || 0)}</span>
</div>
)}
{!!order.couponCode && (
<div className="flex justify-between text-green-700">
<span>Coupon ({order.couponCode})</span>
<span>-{formatCurrency(order.couponDiscount || 0)}</span>
</div>
)}
{parseFloat(generalDiscount) > 0 && (
<div className="flex justify-between text-green-700">
<span>General Discount</span>
<span>-{formatCurrency(parseFloat(generalDiscount) || 0)}</span>
</div>
)}
{(!!order.damageWaiver || (order.damageWaiverFee ?? 0) > 0 || overrideDamageWaiverFee !== '') && (
<div className="flex justify-between">
<span className="text-body">Damage Waiver{overrideDamageWaiverFee !== '' ? ' (override)' : ''}</span>
<span>{formatCurrency(liveTotals.damageWaiverFee || 0)}</span>
</div>
)}
{order.deliveryType === 'delivery' && (
<div className="flex justify-between">
<span className="text-body">
Travel Fee{order.deliveryDistance ? (' (' + order.deliveryDistance.toFixed(1) + ' mi)') : ''}{overrideTravelFee !== '' ? ' (override)' : ''}
</span>
<span>{formatCurrency(liveTotals.deliveryFee || 0)}</span>
</div>
)}
{parseFloat(miscellaneousFees) > 0 && (
<div className="flex justify-between">
<span className="text-body">Miscellaneous Fees</span>
<span>{formatCurrency(parseFloat(miscellaneousFees) || 0)}</span>
</div>
)}
<div className="flex justify-between">
<span className="text-body">Sales Tax{order.taxRate ? (' (' + order.taxRate + '%)') : ''}{overrideTaxAmount !== '' ? ' (override)' : ''}</span>
<span>{formatCurrency(liveTotals.taxAmount)}</span>
</div>
<div className="flex justify-between font-bold border-t border-gray-200 pt-1 mt-1">
<span>Order Total</span>
<span>{formatCurrency(liveTotals.totalAmount)}</span>
</div>
<div className="flex justify-between">
<span className="text-body">Paid</span>
<span>{formatCurrency(order.amountPaid)}</span>
</div>
<div className="flex justify-between font-bold text-red-600">
<span>Balance Due</span>
<span>{formatCurrency(liveTotals.balanceDue)}</span>
</div>
</div>

<div className="flex gap-2 mt-4 no-print">
<button onClick={() => saveItems(false)} disabled={savingItems} className="btn-outline">
{savingItems ? 'Saving...' : 'Save Item Changes'}
</button>
<button onClick={() => saveItems(true)} disabled={savingItems} className="btn-admin text-sm">
{savingItems ? 'Saving...' : 'Save & Send Updated Receipt'}
</button>
</div>
</div>

<div className="admin-card border-l-4 border-accent">
<h2 className="admin-card-header">Payment History</h2>
{order.payments.map((p) => (
<div key={p.id} className="flex justify-between items-center text-sm py-2 border-b border-gray-100" title={p.notes || ''}>
<span>{formatDate(p.createdAt)} — {p.method}{' '}{p.notes && <span className="text-gray-600 text-xs italic ml-1">— {p.notes}</span>}
{p.stripePaymentId ? (
<span className="text-green-700 text-xs font-semibold" title="Real Stripe payment — this money is in your account">✅ In your account</span>
) : (
<span className="text-amber-600 text-xs font-semibold" title="Historical payment imported from ERS — not in your current Stripe account">📋 ERS history</span>
)}
</span>
<span className="flex items-center gap-2">
{formatCurrency(p.amount)}
<button onClick={() => removePayment(p.id)} className="text-red-600 text-xs font-medium hover:underline no-print">Remove</button>
{p.stripePaymentId && !p.stripePaymentId.startsWith('simulated_') && p.amount > 0 && (
<button onClick={() => refundPayment(p.id, p.amount)} className="text-orange-600 text-xs font-medium hover:underline no-print ml-2">Refund</button>
)}
</span>
</div>
))}
<div className="flex gap-2 mt-3 no-print">
<input
type="number"
placeholder="Amount"
value={paymentAmount}
onChange={(e) => setPaymentAmount(e.target.value)}
className="border border-gray-300 rounded px-3 py-1 text-sm"
/>
<input type="text" placeholder="Reason / note (required)" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} className="border border-gray-300 rounded px-3 py-1 text-sm flex-1 min-w-[240px]" /><label className="flex items-center gap-1 text-xs text-gray-600"><input type="checkbox" checked={paymentSkipEmail} onChange={(e) => setPaymentSkipEmail(e.target.checked)} /> Skip email</label><button onClick={addPayment} className="btn-admin text-sm">Add Payment</button>
</div>
</div>

<div className="admin-card border-l-4 border-admin-gold no-print space-y-4">
<h2 className="admin-card-header mb-1">Admin Overrides & Billing</h2>
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
<label className="block text-sm font-medium mb-1">Override Travel Fee ($)</label>
<input type="number" step="0.01" placeholder="Leave blank to use calculated fee" value={overrideTravelFee} onChange={(e) => setOverrideTravelFee(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
</div>
<div>
<label className="block text-sm font-medium mb-1">Override Tax Amount ($)</label>
<input type="number" step="0.01" placeholder="Leave blank to use calculated tax" value={overrideTaxAmount} onChange={(e) => setOverrideTaxAmount(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" /></div><div><label className="block text-sm font-medium mb-1">Override Damage Waiver ($)</label><input type="number" step="0.01" placeholder="Leave blank to use calculated damage waiver" value={overrideDamageWaiverFee} onChange={(e) => setOverrideDamageWaiverFee(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
</div>
<div>
<label className="block text-sm font-medium mb-1">Override Deposit Amount ($)</label>
<input type="number" step="0.01" placeholder="Leave blank to use calculated deposit" value={overrideDepositAmount} onChange={(e) => setOverrideDepositAmount(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
</div>
</div>
<button onClick={saveOrder} className="btn-admin text-sm">Save Overrides</button>
  </div>

  <div className="admin-card border-l-4 border-blue-400 no-print space-y-4">
  <h2 className="admin-card-header mb-1">Raincheck</h2>
  {(order.raincheckApplied || 0) > 0 && (
  <p className="text-sm text-gray-700">Currently applied to this order: {formatCurrency(order.raincheckApplied || 0)}</p>
  )}
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
  <button onClick={applyRaincheck} disabled={applyingRaincheck} className="btn-admin text-sm">Apply Raincheck</button>
  <div className="border-t pt-4">
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
  <button onClick={issueRaincheck} disabled={issuingRaincheck} className="btn-admin text-sm">Issue Raincheck</button>
  </div>
</div>

<div className="admin-card border-l-4 border-gray-400 no-print space-y-4">
<h2 className="admin-card-header">Order Settings & Notes</h2>
<div>
<label className="block text-sm font-medium mb-1">Status</label>
<select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm">
<option value="active">Active</option>
<option value="incomplete">Incomplete</option>
<option value="quote">Quote</option>
<option value="canceled">Canceled</option>
</select>
</div>
<div>
<label className="block text-sm font-medium mb-1">Internal Notes</label>
<textarea
value={internalNotes}
onChange={(e) => setInternalNotes(e.target.value)}
rows={3}
className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
/>
</div>

<div>
<label className="block text-sm font-medium mb-1">Customer Notes</label>
<textarea
value={customerNotes}
onChange={(e) => setCustomerNotes(e.target.value)}
rows={3}
className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
/>
</div>
<div>
<label className="block text-sm font-medium mb-1">Setup Surface</label>
<select value={setupSurface} onChange={(e) => setSetupSurface(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
<option value="">-- Select --</option>
{setupSurfaceOptions.map((s) => (<option key={s.id} value={s.name}>{s.name}</option>))}
</select>
</div>
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
<div className="flex items-center gap-2 mt-2"><input type="checkbox" id="prePayReminderDisabled" checked={prePayReminderDisabled} onChange={(e) => setPrePayReminderDisabled(e.target.checked)} /><label htmlFor="prePayReminderDisabled" className="text-sm">Disable automatic 3-day Pre-Payment Reminder email for this order</label></div>
<button onClick={saveOrder} className="btn-admin">Save Changes</button>
</div>

</div>
)
}
