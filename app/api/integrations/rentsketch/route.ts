import { createHmac, randomUUID, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { NYC_NOTIFICATION_EMAIL } from '@/lib/nycEmail'
import { NYC_PUBLIC_ORIGIN } from '@/lib/nycPublicOrigin'
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

function esc(value: unknown) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function money(value: unknown) {
  if (value === null || value === undefined || value === '') return 'Confirm pricing'
  const amount = Number(value)
  return Number.isFinite(amount) ? '$' + amount.toFixed(2) : 'Confirm pricing'
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
      inventoryVersion: 1,
      orderSyncVersion: 1,
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
  const eventDateText = String(d.eventDate || '').slice(0, 40)
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(eventDateText) ? new Date(eventDateText + 'T12:00:00Z') : null
  const eventDate = parsedDate && Number.isFinite(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === eventDateText ? parsedDate : null
  const items = Array.isArray(d.lineItems) ? d.lineItems.slice(0, 80) : []
  const source = String(d.plannerSource || 'unknown').slice(0, 120)
  const property = d.property && typeof d.property === 'object' ? d.property : {}
  const address = String(property.address || 'Not provided').slice(0, 240)
  const surface = String(property.surfaceType || 'Not provided').slice(0, 80)
  const width = Number(property.widthFt), length = Number(property.lengthFt)
  const area = Number.isFinite(width) && width > 0 && Number.isFinite(length) && length > 0 ? width + ' x ' + length + ' ft' : 'Not provided'
  const estimate = money(d.estimateTotal)
  const message = [
    '[RENTSKETCH NYC QUOTE REQUEST]',
    'Request: ' + requestId,
    'Design: ' + String(d.designId || 'Not provided').slice(0, 120),
    'Source: ' + source,
    'Event type: ' + String(d.eventType || 'Not provided').slice(0, 120),
    'Guests: ' + String(d.guestCount ?? 'Not provided'),
    'Event address: ' + address,
    'Usable area: ' + area,
    'Surface: ' + surface,
    'Dance floor requested: ' + (property.needDance ? 'Yes' : 'No'),
    'Tent / starting setup: ' + String(property.tentId || 'Not provided').slice(0, 120),
    'Submitted estimate: ' + estimate,
    '',
    ...items.map((item:any) => (Number(item?.qty) || 1) + ' x ' + String(item?.label || 'Rental item').slice(0, 160) + ' — ' + money(item?.amount)),
    '',
    String(d.notes || '').slice(0, 8000),
  ].filter(Boolean).join('\n')

  // NYC's Planning Inquiries queue reads the planning_ namespace. Retries of
  // the same RentSketch request must reuse the saved inquiry.
  const inquiryId = 'planning_rentsketch_nyc_' + requestId
  try {
    await prisma.contactMessage.upsert({
      where: { id: inquiryId },
      update: {},
      create: { id: inquiryId, name, email, phone, eventDate, message },
    })
  } catch (error) {
    console.error('NYC RentSketch quote could not be saved', error)
    return NextResponse.json({ error: 'Riverdale planning inquiry could not be saved' }, { status: 502 })
  }

  try {
    const notification = await sendEmail({
      to: NYC_NOTIFICATION_EMAIL,
      subject: 'New RentSketch quote request — ' + name,
      replyTo: email,
      html: `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#172536">
        <h2>New Riverdale RentSketch quote request</h2>
        <p>A customer sent an event layout from Friendly Party Rental NYC. Confirm availability, site details, delivery and final pricing before booking.</p>
        <p><strong>Customer:</strong> ${esc(name)}<br><strong>Email:</strong> ${esc(email)}<br><strong>Phone:</strong> ${esc(phone || 'Not provided')}<br><strong>Event date:</strong> ${esc(eventDateText || 'Not provided')}</p>
        <div style="background:#f5f7f8;border-radius:10px;padding:14px;white-space:pre-wrap">${esc(message)}</div>
        <p><a href="${NYC_PUBLIC_ORIGIN}/admin/planning-inquiries">Open Riverdale Planning Inquiries</a></p>
      </div>`,
    }) as { success?: boolean; simulated?: boolean }
    if (!notification.success || notification.simulated) throw new Error('Staff notification was not delivered')
    return NextResponse.json({ ok: true, saved: true, notificationSent: true })
  } catch {
    console.error('NYC RentSketch quote saved; staff notification was not delivered')
    return NextResponse.json({ error: 'Riverdale inquiry was saved but staff notification could not be delivered', saved: true }, { status: 502 })
  }
}
