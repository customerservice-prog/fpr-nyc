import { createHmac, randomUUID, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { lookupNycRentSketchOrder } from '@/lib/nycRentSketchOrderAccess'
import { NycRentSketchInventoryError, nycRentSketchInventorySnapshot } from '@/lib/nycRentSketchInventory'
import { NycRentSketchOrderSyncError, syncNycRentSketchOrder } from '@/lib/nycRentSketchOrderSync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function secureMatch(actual: string, expected: string) {
  if (!actual || actual.length !== expected.length) return false
  try { return timingSafeEqual(Buffer.from(actual), Buffer.from(expected)) } catch { return false }
}

function fresh(value: unknown) {
  const created = Date.parse(String(value || ''))
  return Number.isFinite(created) && Math.abs(Date.now() - created) <= 5 * 60 * 1000
}

export async function POST(req: NextRequest) {
  const secret = process.env.RENTSKETCH_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'RentSketch integration is not configured' }, { status: 503 })

  const raw = await req.text()
  const supplied = req.headers.get('x-rentsketch-signature') || ''
  const expected = createHmac('sha256', secret).update(raw).digest('hex')
  if (!secureMatch(supplied, expected)) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })

  let payload: any
  try { payload = JSON.parse(raw) } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const d = payload?.data || {}

  if (payload?.type === 'event_pass.order_check' || payload?.type === 'event_pass.order_lookup') {
    if (!fresh(payload.createdAt)) return NextResponse.json({ error: 'Expired order request' }, { status: 401 })
    return NextResponse.json({
      ok: true,
      accessEmailVersion: 1,
      orderAccessVersion: 1,
      ...(payload.type === 'event_pass.order_lookup' ? { order: await lookupNycRentSketchOrder(d) } : {}),
    })
  }

  if (payload?.type === 'event_pass.inventory_snapshot') {
    if (!fresh(payload.createdAt)) return NextResponse.json({ error: 'Expired inventory request' }, { status: 401 })
    try {
      return NextResponse.json({ ok: true, ...(await nycRentSketchInventorySnapshot(d)) })
    } catch (error) {
      if (error instanceof NycRentSketchInventoryError) {
        return NextResponse.json({ error: error.message, code: error.code, inventoryVersion: 1 }, { status: error.status })
      }
      console.error('NYC RentSketch inventory snapshot failed', error)
      return NextResponse.json({ error: 'NYC inventory could not be checked just now.', inventoryVersion: 1 }, { status: 503 })
    }
  }

  if (payload?.type === 'event_pass.order_sync') {
    if (!fresh(payload.createdAt)) return NextResponse.json({ error: 'Expired order sync request' }, { status: 401 })
    try {
      return NextResponse.json({ orderAccessVersion: 1, orderSyncVersion: 1, ...(await syncNycRentSketchOrder(d)) })
    } catch (error) {
      if (error instanceof NycRentSketchOrderSyncError) {
        return NextResponse.json({ error: error.message, code: error.code, orderSyncVersion: 1 }, { status: error.status })
      }
      console.error('NYC RentSketch order sync failed', error)
      return NextResponse.json({ error: 'NYC reservation could not be synchronized just now.', orderSyncVersion: 1 }, { status: 503 })
    }
  }

  if (payload?.type !== 'quote_request.created') return NextResponse.json({ ok: true, ignored: true })

  const requestId = String(d.id || randomUUID()).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80)
  const name = String(d.customerName || 'RentSketch customer').slice(0, 160)
  const email = String(d.customerEmail || '').slice(0, 254) || 'customerservice@friendlypartyrental.com'
  const phone = String(d.customerPhone || '').slice(0, 50) || null
  const eventDateText = String(d.eventDate || '')
  const eventDate = /^\d{4}-\d{2}-\d{2}$/.test(eventDateText) ? new Date(eventDateText + 'T12:00:00Z') : null
  const items = Array.isArray(d.lineItems) ? d.lineItems.slice(0, 80) : []
  const message = [
    '[RENTSKETCH NYC QUOTE REQUEST]',
    'Request: ' + requestId,
    'Design: ' + String(d.designId || 'Not provided').slice(0, 120),
    'Event type: ' + String(d.eventType || 'Not provided').slice(0, 120),
    'Guests: ' + String(d.guestCount ?? 'Not provided'),
    'Event address: ' + String(d.property?.address || 'Not provided').slice(0, 240),
    'Surface: ' + String(d.property?.surfaceType || 'Not provided').slice(0, 80),
    '',
    ...items.map((item:any) => (Number(item?.qty) || 1) + ' x ' + String(item?.label || 'Rental item').slice(0, 160)),
    '',
    String(d.notes || '').slice(0, 5000),
  ].filter(Boolean).join('\n')

  await prisma.contactMessage.upsert({
    where: { id: 'rentsketch_nyc_' + requestId },
    update: {},
    create: { id: 'rentsketch_nyc_' + requestId, name, email, phone, eventDate, message },
  })
  return NextResponse.json({ ok: true })
}
