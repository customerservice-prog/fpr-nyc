export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, selfServiceQuoteEmail } from '@/lib/email'
import { checkoutLineName } from '@/lib/nycCheckoutPricing'

// "Email me this quote" from checkout. The email is built only from the NYC catalog
// (names and prices come from the database, never from the browser), goes to one
// address, escapes every customer-supplied text, and is rate limited so the public
// form can never be used to send arbitrary email through the NYC mailbox.

const WINDOW_MS = 15 * 60 * 1000
const MAX_PER_IP = 5
const MAX_PER_RECIPIENT = 3
const recent = new Map<string, number[]>()

function allow(key: string, max: number): boolean {
  const now = Date.now()
  const hits = (recent.get(key) || []).filter(at => now - at < WINDOW_MS)
  if (hits.length >= max) { recent.set(key, hits); return false }
  hits.push(now)
  recent.set(key, hits)
  if (recent.size > 5000) for (const [k, v] of recent) if (!v.some(at => now - at < WINDOW_MS)) recent.delete(k)
  return true
}

function escapeHtml(value: unknown, max = 120): string {
  return String(typeof value === 'string' ? value : '')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, max)
    .replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char))
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const to = typeof body?.to === 'string' ? body.to.trim().toLowerCase() : ''
    if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(to) || to.length > 254) {
      return NextResponse.json({ error: 'Please enter one valid email address.' }, { status: 400 })
    }
    const lines = Array.isArray(body?.items) ? body.items.slice(0, 60) : []
    if (!lines.length) {
      return NextResponse.json({ error: 'No items in cart' }, { status: 400 })
    }
    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
    if (!allow('ip:' + ip, MAX_PER_IP) || !allow('to:' + to, MAX_PER_RECIPIENT)) {
      return NextResponse.json({ error: 'Too many quote emails. Please try again later or call us.' }, { status: 429 })
    }

    const ids = Array.from(new Set(lines.map((line: any) => (typeof line?.id === 'string' ? line.id : '')).filter(Boolean))) as string[]
    const catalog = await prisma.item.findMany({
      where: { id: { in: ids }, displayToCustomer: true },
      select: { id: true, name: true, cost: true, colorOptions: true },
    })
    const byId = new Map(catalog.map(item => [item.id, item]))
    const items: Array<{ name: string; quantity: number; total: number }> = []
    let subtotalCents = 0
    for (const line of lines) {
      const item = byId.get(typeof line?.id === 'string' ? line.id : '')
      const quantity = Number(line?.quantity)
      if (!item || !Number.isInteger(quantity) || quantity <= 0 || quantity > 10000) continue
      const cents = Math.round(Number(item.cost) * 100) * quantity
      subtotalCents += cents
      items.push({ name: escapeHtml(checkoutLineName(item.name, item.colorOptions, line?.name), 240), quantity, total: cents / 100 })
    }
    if (!items.length) {
      return NextResponse.json({ error: 'The items in your cart are no longer available online. Please review your cart.' }, { status: 409 })
    }

    const { subject, html } = selfServiceQuoteEmail({
      customerName: escapeHtml(body?.customerName, 100),
      eventDate: /^\d{4}-\d{2}-\d{2}$/.test(String(body?.eventDate || '')) ? String(body.eventDate) : '',
      eventTimeSlot: escapeHtml(body?.eventTimeSlot, 80) || null,
      pickupTimeSlot: escapeHtml(body?.pickupTimeSlot, 80) || null,
      deliveryType: 'delivery',
      items,
      subtotal: subtotalCents / 100,
    })

    try {
      const result = await sendEmail({ to, subject, html })
      if (!result.success) return NextResponse.json({ error: 'Failed to send email' }, { status: 502 })
    } catch {
      return NextResponse.json({ error: 'Quote email is not available right now. Please call us or continue to checkout.' }, { status: 503 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Send quote error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
