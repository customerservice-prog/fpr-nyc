'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'
import { formatTaxRatePercent } from '@/lib/nycSalesTax'

interface QuoteItemInput {
itemName: string
quantity: number
}

interface QuoteResultItem {
itemId: string
itemName: string
quantity: number
unitPrice: number
total: number
taxable: boolean
}

interface QuoteResult {
items: QuoteResultItem[]
unmatched: string[]
subtotal: number
taxRate: number | null
taxAmount: number
total: number
}

interface AssistantOrderCard {
id: string
orderNumber: string
status: string
customerName: string
customerEmail: string | null
customerPhone: string | null
eventDate: string
eventAddress: string | null
eventCity: string | null
eventState: string | null
eventZip: string | null
deliveryType: string
eventTimeSlot: string | null
pickupTimeSlot: string | null
items: { itemName: string; quantity: number; unitPrice: number }[]
totalAmount: number
amountPaid: number
balanceDue: number
notes: string | null
internalNotes: string | null
driverName: string | null
pickupDriverName: string | null
damageWaiver: boolean
damageWaiverFee: number | null
}

interface ChatMessage {
role: 'user' | 'assistant'
text: string
orders?: AssistantOrderCard[]
}

interface SavedOrderInfo {
orderNumber: string
id: string
payLink: string
emailSimulated: boolean
}

interface CatalogItem {
id: string
name: string
cost: number
taxable: boolean
}

const QUICK_ACTIONS = ['Outstanding balances', "Today's deliveries", 'Low stock items', 'Active orders']

function OrderCard({ card, onCancelled }: { card: AssistantOrderCard; onCancelled: (id: string) => void }) {
const [cancelling, setCancelling] = useState(false)
const isCanceled = card.status === 'canceled' || card.status === 'cancelled'; const balanceDue = Math.round((card.totalAmount - card.amountPaid) * 100) / 100

const cancelOrder = async () => {
if (!window.confirm('Cancel order ' + card.orderNumber + ' for ' + card.customerName + '? This sets its status to canceled.')) return
setCancelling(true)
try {
const res = await fetch('/api/admin/orders/' + card.id, {
method: 'PUT',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ status: 'canceled' }),
})
if (!res.ok) throw new Error('Failed')
toast.success('Order ' + card.orderNumber + ' canceled')
onCancelled(card.id)
} catch {
toast.error('Failed to cancel order')
} finally {
setCancelling(false)
}
}

const copyPayLink = async () => {
const link = window.location.origin + '/pay/' + card.id
try {
await navigator.clipboard.writeText(link)
toast.success('Payment link copied')
} catch {
toast.error(link)
}
}

return (
<div className="admin-card border-l-4 border-secondary !mb-0 mt-2 text-sm">
<div className="flex justify-between items-start flex-wrap gap-2">
<div>
<p className="font-semibold text-dark">
{card.orderNumber} — {card.customerName}{' '}
<span className={'badge ' + (isCanceled ? 'badge-canceled' : 'badge-active')}>
{card.status}
</span>
</p>
<p className="text-xs text-body">{new Date(card.eventDate).toLocaleDateString()}{card.eventTimeSlot ? (' · ' + card.eventTimeSlot) : ''} · {card.deliveryType}</p>
{(card.eventAddress || card.eventCity) && (
<p className="text-xs text-body">{card.eventAddress}{card.eventCity ? (', ' + card.eventCity) : ''} {card.eventState} {card.eventZip}</p>
)}
{(card.customerEmail || card.customerPhone) && (
<p className="text-xs text-body">{card.customerEmail}{card.customerPhone ? (' · ' + card.customerPhone) : ''}</p>
)}
</div>
<div className="text-right">
<p className="text-xs">Total {formatCurrency(card.totalAmount)}</p>
<p className="text-xs">Paid {formatCurrency(card.amountPaid)}</p>
<p className={'text-xs font-bold ' + (balanceDue > 0 ? 'text-red-600' : 'text-green-700')}>{balanceDue > 0 ? 'Balance ' + formatCurrency(balanceDue) : balanceDue < 0 ? 'Overpaid by ' + formatCurrency(Math.abs(balanceDue)) : 'Paid in Full'}</p>
</div>
</div>

{card.items.length > 0 && (
<div className="mt-2 border-t border-gray-100 pt-2">
{card.items.map((it, idx) => (
<p key={idx} className="text-xs text-body">{it.itemName} x{it.quantity} @ {formatCurrency(it.unitPrice)}</p>
))}
</div>
)}

{(card.driverName || card.pickupDriverName) && (
<p className="text-xs text-body mt-1">
{card.driverName ? ('Delivery driver: ' + card.driverName + '. ') : ''}
{card.pickupDriverName ? ('Pickup driver: ' + card.pickupDriverName + '.') : ''}
</p>
)}

{card.damageWaiver && (
<p className="text-xs text-body mt-1">Damage Waiver: {formatCurrency(card.damageWaiverFee || 0)}</p>
)}

{card.notes && (
<p className="text-xs bg-yellow-100 text-yellow-900 rounded px-2 py-1 mt-2">Customer notes: {card.notes}</p>
)}
{card.internalNotes && (
<p className="text-xs bg-blue-50 text-blue-900 rounded px-2 py-1 mt-1">Internal notes: {card.internalNotes}</p>
)}

<div className="flex gap-2 mt-3 flex-wrap">
<Link href={'/admin/orders/' + card.id} className="btn-outline text-xs">Open Full Order</Link>
<button onClick={copyPayLink} className="btn-outline text-xs">Copy Payment Link</button>
{!isCanceled && (
<button onClick={cancelOrder} disabled={cancelling} className="btn-danger-outline text-xs">
{cancelling ? 'Cancelling...' : 'Cancel Order'}
</button>
)}
{isCanceled && <span className="text-xs text-gray-400 px-2 py-1">Already canceled</span>}
</div>
</div>
)
}

export default function VirtualAssistantPage() {
const [name, setName] = useState('')
const [email, setEmail] = useState('')
const [phone, setPhone] = useState('')
const [eventDate, setEventDate] = useState('')
const [eventTime, setEventTime] = useState('')
const [items, setItems] = useState<QuoteItemInput[]>([{ itemName: '', quantity: 1 }])
const [quote, setQuote] = useState<QuoteResult | null>(null)
const [generating, setGenerating] = useState(false)
const [saving, setSaving] = useState(false)
const [savedOrder, setSavedOrder] = useState<SavedOrderInfo | null>(null)
const [catalog, setCatalog] = useState<CatalogItem[]>([])

const [question, setQuestion] = useState('')
const [chat, setChat] = useState<ChatMessage[]>([
{
role: 'assistant',
text: "Hi! Type a customer's name (even just first or last name) or an order number and I'll pull up full order details with buttons to open or cancel it. You can also ask about a driver, item stock, today's deliveries, outstanding balances, low stock items, or how to do something in the system.",
},
])
const [asking, setAsking] = useState(false)

useEffect(() => {
fetch('/api/admin/virtual-assistant/catalog')
.then((res) => (res.ok ? res.json() : null))
.then((data) => {
if (data && Array.isArray(data.items)) {
setCatalog(data.items.map((i: any) => ({ id: i.id, name: i.name, cost: i.cost, taxable: i.taxable })))
}
})
.catch(() => {})
}, [])

const findCatalogMatch = (itemName: string): CatalogItem | null => {
const n = itemName.trim().toLowerCase()
if (!n) return null
const exact = catalog.find((c) => c.name.toLowerCase() === n)
if (exact) return exact
const starts = catalog.find((c) => c.name.toLowerCase().startsWith(n))
if (starts) return starts
return catalog.find((c) => c.name.toLowerCase().includes(n)) || null
}

const updateItem = (idx: number, field: keyof QuoteItemInput, value: string) => {
setItems((prev) =>
prev.map((it, i) =>
i === idx ? { ...it, [field]: field === 'quantity' ? parseInt(value) || 1 : value } : it
)
)
}

const addItemRow = () => setItems((prev) => [...prev, { itemName: '', quantity: 1 }])
const removeItemRow = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx))

const generateQuote = async () => {
const validItems = items.filter((i) => i.itemName.trim())
if (validItems.length === 0) {
toast.error('Add at least one item')
return
}
setGenerating(true)
setSavedOrder(null)
try {
const res = await fetch('/api/admin/virtual-assistant/quote', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ items: validItems }),
})
const data = await res.json()
setQuote(data)
if (data.unmatched && data.unmatched.length) {
toast.error("Couldn't find a match for: " + data.unmatched.join(', '))
}
} catch {
toast.error('Failed to generate quote')
} finally {
setGenerating(false)
}
}

const saveAndSendQuote = async () => {
if (!quote || quote.items.length === 0) return
if (!name.trim() || !email.trim()) {
toast.error('Name and email are required to save the quote')
return
}
if (!eventDate) {
toast.error('Event date is required')
return
}
setSaving(true)
setSavedOrder(null)
try {
const parts = name.trim().split(' ')
const firstName = parts[0]
const lastName = parts.slice(1).join(' ') || '-'
const res = await fetch('/api/admin/orders', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
customer: { firstName, lastName, email, phone: phone || undefined },
status: 'quote',
eventDate,
eventTimeSlot: eventTime || undefined,
subtotal: quote.subtotal,
taxRate: quote.taxRate ?? 0,
taxAmount: quote.taxAmount,
totalAmount: quote.total,
balanceDue: quote.total,
items: quote.items.map((i) => ({
itemId: i.itemId,
itemName: i.itemName,
quantity: i.quantity,
unitPrice: i.unitPrice,
})),
}),
})
if (!res.ok) {
toast.error('Failed to create quote order')
setSaving(false)
return
}
const data = await res.json()
const orderId = data.order.id
const orderNumber = data.order.orderNumber

try {
const sendRes = await fetch('/api/admin/orders/' + orderId + '/send-quote', { method: 'POST' })
const sendData = await sendRes.json()
if (sendRes.ok && sendData.success) {
setSavedOrder({
orderNumber,
id: orderId,
payLink: sendData.payLink,
emailSimulated: !!sendData.simulated,
})
if (sendData.simulated) {
toast.error('Quote ' + orderNumber + " was saved, but email isn't set up on the server yet - copy the link below to send it yourself.")
} else {
toast.success('Quote ' + orderNumber + ' created and emailed to ' + email + '!')
}
} else {
setSavedOrder({
orderNumber,
id: orderId,
payLink: window.location.origin + '/pay/' + orderId,
emailSimulated: true,
})
toast.error('Order ' + orderNumber + ' was saved, but the email failed to send. Copy the link below to send it yourself.')
}
} catch {
setSavedOrder({
orderNumber,
id: orderId,
payLink: window.location.origin + '/pay/' + orderId,
emailSimulated: true,
})
toast.error('Order ' + orderNumber + ' was saved, but the email failed to send. Copy the link below to send it yourself.')
}
} catch {
toast.error('Failed to create quote order')
} finally {
setSaving(false)
}
}

const askQuestion = async (overrideQ?: string) => {
const q = (overrideQ ?? question).trim()
if (!q) return
setChat((prev) => [...prev, { role: 'user', text: q }])
setQuestion('')
setAsking(true)
try {
const res = await fetch('/api/admin/virtual-assistant/ask', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ question: q }),
})
const data = await res.json()
setChat((prev) => [...prev, { role: 'assistant', text: data.answer || "Sorry, I couldn't process that.", orders: data.orders || undefined }])
} catch {
setChat((prev) => [...prev, { role: 'assistant', text: 'Something went wrong answering that.' }])
} finally {
setAsking(false)
}
}

const markOrderCancelled = (orderId: string) => {
setChat((prev) =>
prev.map((m) => {
if (!m.orders) return m
return { ...m, orders: m.orders.map((o) => (o.id === orderId ? { ...o, status: 'canceled' } : o)) }
})
)
}

return (
<div className="p-4 max-w-6xl mx-auto">
<h1 className="text-2xl font-bold text-dark mb-2">Virtual Assistant</h1>
<p className="text-sm text-body mb-3">
Build a quick quote for a customer, or ask about an order, customer, driver, or item and manage it right here.
This assistant runs entirely on our own data - no outside AI service or API key is used.
</p>

<details className="admin-card border-l-4 border-secondary text-sm text-dark">
<summary className="font-semibold cursor-pointer">How to get a quote to a customer (click to expand)</summary>
<ol className="list-decimal list-inside space-y-0.5 mt-2">
<li>Fill in the customer&apos;s name, email, event date, and the items they want below.</li>
<li>Click <strong>Generate Quote</strong> to see the price.</li>
<li>Click <strong>Save &amp; Email Quote to Customer</strong> - this saves it as a quote order and instantly emails the customer a link where they can view and pay it online. You&apos;ll also get a copy of that link here in case you want to text it to them instead.</li>
</ol>
</details>

<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
<div className="admin-card border-l-4 border-admin-green !mb-0">
<h2 className="admin-card-header">Build a Quote</h2>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
<input
placeholder="Customer Name"
value={name}
onChange={(e) => setName(e.target.value)}
className="border border-gray-300 rounded px-3 py-2 text-sm"
/>
<input
placeholder="Email"
value={email}
onChange={(e) => setEmail(e.target.value)}
className="border border-gray-300 rounded px-3 py-2 text-sm"
/>
<input
placeholder="Phone (optional)"
value={phone}
onChange={(e) => setPhone(e.target.value)}
className="border border-gray-300 rounded px-3 py-2 text-sm"
/>
<input
type="date"
value={eventDate}
onChange={(e) => setEventDate(e.target.value)}
className="border border-gray-300 rounded px-3 py-2 text-sm"
/>
<input
placeholder="Event Time (e.g. 2:00 PM, optional)"
value={eventTime}
onChange={(e) => setEventTime(e.target.value)}
className="border border-gray-300 rounded px-3 py-2 text-sm sm:col-span-2"
/>
</div>

<h3 className="text-sm font-semibold text-body mb-2">Items</h3>
<datalist id="catalog-item-names">
{catalog.map((c) => (
<option key={c.id} value={c.name} />
))}
</datalist>
<div className="space-y-2 mb-3">
{items.map((it, idx) => {
const match = findCatalogMatch(it.itemName)
return (
<div key={idx}>
<div className="flex gap-2">
<input
placeholder="Item name (e.g. 20x30 Pole Tent)"
value={it.itemName}
onChange={(e) => updateItem(idx, 'itemName', e.target.value)}
list="catalog-item-names"
className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
/>
<input
type="number"
min={1}
value={it.quantity}
onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
className="w-20 border border-gray-300 rounded px-3 py-2 text-sm"
/>
{items.length > 1 && (
<button onClick={() => removeItemRow(idx)} className="text-red-600 text-xs font-medium hover:underline px-2">
Remove
</button>
)}
</div>
{it.itemName.trim() && (
<p className="text-xs mt-1 pl-1">
{match ? (
<span className="text-green-700">{match.name} — {formatCurrency(match.cost)} each · line total {formatCurrency(match.cost * (it.quantity || 1))}</span>
) : (
<span className="text-amber-600">No exact catalog match yet - check spelling or pick from the list</span>
)}
</p>
)}
</div>
)
})}
</div>
<button onClick={addItemRow} className="text-sm text-secondary hover:underline mb-4">
+ Add another item
</button>

<div className="flex gap-2">
<button onClick={generateQuote} disabled={generating} className="btn-admin text-sm px-4 py-2">
{generating ? 'Calculating...' : 'Generate Quote'}
</button>
</div>

{quote && (
<div className="mt-4 border-t border-gray-100 pt-4">
{quote.items.map((i, idx) => (
<div key={idx} className="flex justify-between text-sm mb-1">
<span>
{i.itemName} x{i.quantity}
</span>
<span>{formatCurrency(i.total)}</span>
</div>
))}
{quote.unmatched.length > 0 && (
<p className="text-xs text-red-500 mb-2">No match found for: {quote.unmatched.join(', ')}</p>
)}
<div className="flex justify-between text-sm text-body mt-2">
<span>Subtotal</span>
<span>{formatCurrency(quote.subtotal)}</span>
</div>
<div className="flex justify-between text-sm text-body">
<span>{quote.taxRate === null ? 'Tax (not set: add the delivery address tax in the order)' : 'Tax (' + formatTaxRatePercent(quote.taxRate) + ')'}</span>
<span>{formatCurrency(quote.taxAmount)}</span>
</div>
<div className="flex justify-between font-bold text-dark mt-1">
<span>Total</span>
<span>{formatCurrency(quote.total)}</span>
</div>
<button
onClick={saveAndSendQuote}
disabled={saving}
className="btn-admin text-sm px-4 py-2 mt-4 w-full"
>
{saving ? 'Saving & Sending...' : 'Save & Email Quote to Customer'}
</button>

{savedOrder && (
<div className="mt-4 p-3 rounded border border-green-200 bg-green-50 text-sm">
<p className="font-semibold text-dark mb-1">
Quote #{savedOrder.orderNumber} saved{!savedOrder.emailSimulated ? ' and emailed to the customer' : ''}.
</p>
{savedOrder.emailSimulated && (
<p className="text-red-600 mb-2">
The email did not actually go out (server email isn&apos;t configured, or sending failed). Copy this link and text or email it to the customer yourself:
</p>
)}
{!savedOrder.emailSimulated && (
<p className="text-body mb-2">
Here is the same link, in case you also want to text it to the customer:
</p>
)}
<input
readOnly
value={savedOrder.payLink}
onFocus={(e) => e.target.select()}
className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white"
/>
</div>
)}
</div>
)}
</div>

<div className="admin-card border-l-4 border-secondary !mb-0 flex flex-col" style={{ maxHeight: 700 }}>
<h2 className="admin-card-header">Ask the Assistant</h2>
<div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1" style={{ minHeight: 80 }}>
{chat.map((c, idx) => (
<div key={idx}>
<div
className={'text-sm p-2 rounded max-w-[95%] ' + (c.role === 'user' ? 'bg-green-100 ml-auto text-right' : 'bg-gray-100')}
>
{c.text}
</div>
{c.orders && c.orders.map((card) => (
<OrderCard key={card.id} card={card} onCancelled={markOrderCancelled} />
))}
</div>
))}
{asking && <div className="text-sm text-body">Thinking...</div>}
</div>
<div className="flex gap-2 flex-wrap mb-2">
{QUICK_ACTIONS.map((qa) => (
<button
key={qa}
onClick={() => askQuestion(qa)}
disabled={asking}
className="text-xs border border-gray-300 rounded-full px-3 py-1 hover:bg-gray-100 text-body"
>
{qa}
</button>
))}
</div>
<div className="flex gap-2">
<input
value={question}
onChange={(e) => setQuestion(e.target.value)}
onKeyDown={(e) => {
if (e.key === 'Enter') askQuestion()
}}
placeholder="e.g. Donna Crosby, order 9058, or driver Mike's phone"
className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
/>
<button onClick={() => askQuestion()} disabled={asking} className="btn-admin text-sm px-4 py-2">
Ask
</button>
</div>
</div>
</div>
</div>
)
}
