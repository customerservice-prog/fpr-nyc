export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'

function startOfDay(d: Date) {
return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function endOfDay(d: Date) {
const x = startOfDay(d)
x.setDate(x.getDate() + 1)
return x
}
function startOfMonth(d: Date) {
return new Date(d.getFullYear(), d.getMonth(), 1)
}

const STOPWORDS = new Set([
'the','a','an','is','are','was','were','what','whats',"what's",'who','when','where','why','how',
'do','does','did','can','could','should','would','order','orders','customer','customers','balance',
'on','for','of','in','at','to','and','or','me','my','please','show','find','get','look','lookup','up',
'about','with','has','have','had','will','it','this','that','their','they','his','her','him','she','he',
'you','your','tell','give','need','want','info','information','details','detail','all'
])

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

const ORDER_INCLUDE = { customer: true, items: true, driver: true, pickupDriver: true } as const

function buildOrderCard(order: any): AssistantOrderCard {
return {
id: order.id,
orderNumber: order.orderNumber,
status: order.status,
customerName: order.customer.firstName + ' ' + order.customer.lastName,
customerEmail: order.customer.email || null,
customerPhone: order.customer.phone || null,
eventDate: order.eventDate,
eventAddress: order.eventAddress || null,
eventCity: order.eventCity || null,
eventState: order.eventState || null,
eventZip: order.eventZip || null,
deliveryType: order.deliveryType,
eventTimeSlot: order.eventTimeSlot || null,
pickupTimeSlot: order.pickupTimeSlot || null,
items: order.items.map((i: any) => ({ itemName: i.itemName, quantity: i.quantity, unitPrice: i.unitPrice })),
totalAmount: order.totalAmount,
amountPaid: order.amountPaid,
balanceDue: order.balanceDue,
notes: order.notes || null,
internalNotes: order.internalNotes || null,
driverName: order.driver ? order.driver.name : null,
pickupDriverName: order.pickupDriver ? order.pickupDriver.name : null,
damageWaiver: !!order.damageWaiver,
damageWaiverFee: order.damageWaiverFee ?? null,
}
}

function orderSummaryText(card: AssistantOrderCard): string {
const itemsList = card.items.map((i) => i.itemName + ' x' + i.quantity).join(', ') || 'no items'
return 'Order ' + card.orderNumber + ' — ' + card.customerName + ', event ' + new Date(card.eventDate).toLocaleDateString() +
', status: ' + card.status + '. Total ' + formatCurrency(card.totalAmount) + ', paid ' + formatCurrency(card.amountPaid) +
', balance ' + formatCurrency(card.balanceDue) + '. Items: ' + itemsList + '.'
}

const FAQ: { keywords: string[]; answer: string }[] = [
{
keywords: ['send', 'quote'],
answer:
"Fill in the customer's name, email, event date, and items on the left of this page, click Generate Quote, then click 'Save & Email Quote to Customer'. That saves it as a quote order and instantly emails the customer a link to view and pay it online - you'll also get a copy of that link to text them if you'd rather.",
},
{
keywords: ['email', 'quote'],
answer:
"Fill in the customer's name, email, event date, and items on the left of this page, click Generate Quote, then click 'Save & Email Quote to Customer'. That saves it as a quote order and instantly emails the customer a link to view and pay it online - you'll also get a copy of that link to text them if you'd rather.",
},
{
keywords: ['cancel', 'order'],
answer:
"Type the customer's name or order number above and I'll pull up the order with a Cancel Order button right here in the chat. You can also open it from Admin > Orders. Note: if the order was migrated from ERS, it must also be cancelled separately in ERS.",
},
{
keywords: ['change', 'quantity'],
answer: "Open the order (type the order number or customer name here, or go to Admin > Orders), then edit the Qty or Unit Price box directly in the Items table and click Save Item Changes. No need to remove and re-add an item anymore.",
},
{
keywords: ['edit', 'quantity'],
answer: "Open the order (type the order number or customer name here, or go to Admin > Orders), then edit the Qty or Unit Price box directly in the Items table and click Save Item Changes. No need to remove and re-add an item anymore.",
},
{
keywords: ['add', 'driver'],
answer:
"Go to the Delivery page and click 'Manage Drivers' (or go to /admin/drivers), then fill in the driver's name and click Add Driver. There's also a QR code on the Delivery page drivers can scan to open the driver app on their phone.",
},
{
keywords: ['qr', 'code'],
answer: "The Driver App QR code is at the top of the Delivery page. Drivers scan it with their phone camera to open the driver app, then use 'Add to Home Screen' to install it.",
},
{
keywords: ['new', 'order'],
answer:
"Click '+ New Order' on the Admin > Orders page to start a new order, or use the quote builder on this page to draft one first.",
},
{
keywords: ['refund'],
answer:
"Refunds are issued from a payment on the order's detail page - open the order, find the payment in question, and use the refund action there.",
},
{
keywords: ['raincheck'],
answer:
"Rainchecks can be issued from the Rainchecks page in the admin nav, or applied directly to a customer/order when cancelling due to weather.",
},
{
keywords: ['damage', 'waiver'],
answer: "The Damage Waiver amount and override can be set directly on an order's detail page.",
},
{
keywords: ['note', 'customer'],
answer: 'Customer and internal notes can be viewed and edited directly on the order detail page under the Notes section, or right here if I find the order for you.',
},
{
keywords: ['assign', 'driver'],
answer:
"Use the Delivery page's 'Assign Drivers' button, or assign a driver directly from a day's delivery list on the Delivery page.",
},
]

export async function POST(request: NextRequest) {
const session = await getServerSession(authOptions)
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

const body = await request.json()
const q: string = (body.question || '').toString().trim()
const qLower = q.toLowerCase()

if (!q) {
return NextResponse.json({ answer: 'Please type a question.' })
}

const today = new Date()

// 1. Order number lookup - highest priority, most specific
const orderMatch = q.match(/\b(ERS-[A-Za-z0-9-]+|FPR-[A-Za-z0-9-]+|\d{4,6})\b/i)
if (orderMatch) {
const term = orderMatch[1]
const order = await prisma.order.findFirst({
where: { orderNumber: { equals: term, mode: 'insensitive' } },
include: ORDER_INCLUDE,
})
if (order) {
const card = buildOrderCard(order)
return NextResponse.json({ answer: orderSummaryText(card), orders: [card] })
}
return NextResponse.json({ answer: 'I couldn\'t find an order matching "' + term + '". Double check the order number.' })
}

// 2. Exact customer name match - try every consecutive word pair, case-insensitive
const rawWords = q.replace(/[?!.,]/g, '').split(/\s+/).filter(Boolean)
const cleanWords = rawWords.map((w) => w.replace(/'s$/i, ''))
for (let i = 0; i < cleanWords.length - 1; i++) {
const first = cleanWords[i]
const last = cleanWords[i + 1]
if (first.length < 2 || last.length < 2) continue
const matches = await prisma.customer.findMany({
where: { firstName: { equals: first, mode: 'insensitive' }, lastName: { equals: last, mode: 'insensitive' } },
include: { orders: { orderBy: { eventDate: 'desc' }, include: { items: true, driver: true, pickupDriver: true } } },
})
if (matches.length > 0) {
return NextResponse.json(await answerForCustomers(matches))
}
}

// 3. Driver lookup
if (qLower.includes('driver')) {
const tokens = cleanWords.filter((w) => w.length > 1 && !STOPWORDS.has(w.toLowerCase()) && w.toLowerCase() !== 'driver' && w.toLowerCase() !== 'drivers')
if (tokens.length > 0) {
const driver = await prisma.driver.findFirst({
where: { OR: tokens.map((t) => ({ name: { contains: t, mode: 'insensitive' } })) },
})
if (driver) {
return NextResponse.json({
answer: driver.name + ' — phone: ' + (driver.phone || 'none on file') + ', email: ' + (driver.email || 'none on file') + ', vehicle: ' + (driver.vehicleInfo || 'none on file') + '. Status: ' + (driver.isActive ? 'Active' : 'Inactive') + '.',
})
}
}
}

// 4. Stat questions
if (qLower.includes('active order')) {
const count = await prisma.order.count({ where: { status: 'active', eventDate: { gte: startOfDay(today) } } })
return NextResponse.json({ answer: 'There are currently ' + count + ' active upcoming order(s) in the system.' })
}

if (qLower.includes('revenue') || qLower.includes('collected this month') || (qLower.includes('made') && qLower.includes('month'))) {
const payments = await prisma.payment.aggregate({
_sum: { amount: true },
where: { createdAt: { gte: startOfMonth(today) }, status: 'succeeded' },
})
return NextResponse.json({ answer: "We've collected " + formatCurrency(payments._sum.amount || 0) + ' in payments so far this month.' })
}

if (qLower.includes('low stock') || qLower.includes('out of stock')) {
const items = await prisma.item.findMany({ where: { quantity: { lte: 0 } }, take: 15 })
if (items.length === 0) return NextResponse.json({ answer: 'No items are currently showing zero quantity.' })
return NextResponse.json({ answer: 'Items at zero quantity: ' + items.map((i) => i.name).join(', ') + '.' })
}

if (qLower.includes('today') && (qLower.includes('deliver') || qLower.includes('order') || qLower.includes('pickup'))) {
const todaysOrders = await prisma.order.findMany({
where: { eventDate: { gte: startOfDay(today), lt: endOfDay(today) }, status: { notIn: ['canceled', 'quote'] } },
include: { customer: true, driver: true, pickupDriver: true },
take: 20,
})
if (todaysOrders.length === 0) return NextResponse.json({ answer: 'There are no orders scheduled for today.' })
const lines = todaysOrders.map((o) => o.orderNumber + ' - ' + o.customer.firstName + ' ' + o.customer.lastName + (o.driver ? ' (driver: ' + o.driver.name + ')' : ' (no driver assigned)'))
return NextResponse.json({ answer: 'There are ' + todaysOrders.length + ' order(s) scheduled for today: ' + lines.join('; ') + '.' })
}

if (qLower.includes('balance') && (qLower.includes('outstanding') || qLower.includes('total'))) {
const agg = await prisma.order.aggregate({
_sum: { balanceDue: true },
where: { status: { notIn: ['canceled', 'quote'] } },
})
return NextResponse.json({ answer: 'Total outstanding balance across active orders is ' + formatCurrency(agg._sum.balanceDue || 0) + '.' })
}

// 5. Item / inventory stock lookup
if (qLower.includes('stock') || qLower.includes('how many') || qLower.includes('inventory') || qLower.includes('quantity of')) {
let term = q
.replace(/how many/gi, '')
.replace(/do we have/gi, '')
.replace(/are there/gi, '')
.replace(/in stock/gi, '')
.replace(/stock of/gi, '')
.replace(/quantity of/gi, '')
.replace(/inventory of/gi, '')
.replace(/[?!.,]/g, '')
.trim()
if (term.length > 1) {
const item = await prisma.item.findFirst({ where: { name: { contains: term, mode: 'insensitive' } } })
if (item) {
return NextResponse.json({ answer: item.name + ': ' + item.quantity + ' in stock, priced at ' + formatCurrency(item.cost) + ' each. Status: ' + item.status + '.' })
}
}
}

// 6. Loose fallback customer search (single-token, contains match) - only if nothing above matched
const looseTokens = cleanWords.filter((w) => w.length >= 3 && !STOPWORDS.has(w.toLowerCase()))
if (looseTokens.length > 0) {
const looseMatches = await prisma.customer.findMany({
where: {
OR: looseTokens.flatMap((t) => [
{ firstName: { contains: t, mode: 'insensitive' } },
{ lastName: { contains: t, mode: 'insensitive' } },
]),
},
include: { orders: { orderBy: { eventDate: 'desc' }, include: { items: true, driver: true, pickupDriver: true } } },
take: 10,
})
if (looseMatches.length > 0) {
return NextResponse.json(await answerForCustomers(looseMatches))
}
}

// 7. FAQ how-to fallback
let best = { score: 0, answer: '' }
for (const entry of FAQ) {
const score = entry.keywords.filter((k) => qLower.includes(k)).length
if (score > best.score) best = { score, answer: entry.answer }
}
if (best.score > 0) return NextResponse.json({ answer: best.answer })

return NextResponse.json({
answer:
"I couldn't find a matching order, customer, or driver, and I'm not sure how to answer that yet. Try typing a specific order number, a customer's name (even just first or last name), a driver's name, an item name to check stock, today's deliveries, outstanding balances, low stock items, or how to do something in the system (like cancelling an order, editing item quantities, or adding a driver).",
})
}

function buildCardFromCustomerOrder(customer: any, order: any): AssistantOrderCard {
return {
id: order.id,
orderNumber: order.orderNumber,
status: order.status,
customerName: customer.firstName + ' ' + customer.lastName,
customerEmail: customer.email || null,
customerPhone: customer.phone || null,
eventDate: order.eventDate,
eventAddress: order.eventAddress || null,
eventCity: order.eventCity || null,
eventState: order.eventState || null,
eventZip: order.eventZip || null,
deliveryType: order.deliveryType,
eventTimeSlot: order.eventTimeSlot || null,
pickupTimeSlot: order.pickupTimeSlot || null,
items: (order.items || []).map((i: any) => ({ itemName: i.itemName, quantity: i.quantity, unitPrice: i.unitPrice })),
totalAmount: order.totalAmount,
amountPaid: order.amountPaid,
balanceDue: order.balanceDue,
notes: order.notes || null,
internalNotes: order.internalNotes || null,
driverName: order.driver ? order.driver.name : null,
pickupDriverName: order.pickupDriver ? order.pickupDriver.name : null,
damageWaiver: !!order.damageWaiver,
damageWaiverFee: order.damageWaiverFee ?? null,
}
}

async function answerForCustomers(customers: any[]) {
if (customers.length === 1) {
const c = customers[0]
const orders = c.orders || []
if (orders.length === 0) {
return { answer: c.firstName + ' ' + c.lastName + ' has no orders on file.' }
}
const cards: AssistantOrderCard[] = orders.slice(0, 8).map((o: any) => buildCardFromCustomerOrder(c, o))
if (cards.length === 1) {
return { answer: orderSummaryText(cards[0]), orders: cards }
}
const summary =
c.firstName + ' ' + c.lastName + ' has ' + orders.length + ' order(s): ' +
cards
.map((card: AssistantOrderCard) => card.orderNumber + ' (' + new Date(card.eventDate).toLocaleDateString() + ', ' + card.status + ', balance ' + formatCurrency(card.balanceDue) + ')')
.join('; ') +
'.'
return { answer: summary, orders: cards }
}
const list = customers
.slice(0, 8)
.map((c: any) => c.firstName + ' ' + c.lastName + ' (' + c.email + ', ' + (c.orders?.length || 0) + ' order(s))')
.join('; ')
return {
answer:
'I found ' + customers.length + ' matching customers: ' + list + '. Try typing their full name along with a unique order number, or ask about a specific order number.',
}
}
