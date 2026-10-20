export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasStaffPermission } from '@/lib/staffPermissions'
import { resolveDriverAccess } from '@/lib/driverAccess'
import { BUSINESS } from '@/lib/utils'

const REVIEW_PROFILE_ID = ''
const REVIEW_MAPS_CID = ''
const REVIEW_PLACE_ID = ''
const REVIEW_URL = BUSINESS.googleProfile || BUSINESS.mapUrl || ''
const DUPLICATE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000

function normalizePhone(value: string | null | undefined) {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.length === 10) return '+1' + digits
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits
  return null
}

function setupPhrase(itemNames: string[]) {
  const text = itemNames.join(' ').toLowerCase()
  const parts: string[] = []
  if (/tent|canopy/.test(text)) parts.push('tent setup')
  if (/chair/.test(text) && parts.length < 2) parts.push('seating')
  if (/table/.test(text) && parts.length < 2) parts.push('tables')
  if (/bounce|waterslide|water slide|inflatable/.test(text)) parts.push('inflatable')
  if (/photo.?booth/.test(text)) parts.push('photo booth')
  if (/dance.?floor/.test(text)) parts.push('dance floor')
  if (/cotton candy|popcorn|snow cone|foam machine/.test(text)) parts.push('party extras')
  const unique = [...new Set(parts)].slice(0, 2)
  if (unique.length === 0) return 'rental setup'
  if (unique.length === 1) return unique[0]
  return unique[0] + ' and ' + unique[1]
}

function reviewMessage(firstName: string, itemNames: string[]) {
  const name = firstName.trim()
  const greeting = name ? `Hi ${name}! ` : 'Hi! '
  const setup = setupPhrase(itemNames)
  return `${greeting}We hope your ${setup} helped make your event come together just the way you pictured it. Thank you for trusting ${BUSINESS.name} — it really means a lot to our small business. If you have a minute, would you share how everything went in a Google review? Your experience helps the next local family know what to expect from us. And if you snapped a photo of the setup or party, add it with your review — we love seeing our rentals in action. ${REVIEW_URL}`
}


export async function GET(request: NextRequest) {
  if (!REVIEW_URL) return NextResponse.json({ error: 'Google review profile is not configured for this location.' }, { status: 503 })
  const orderId = request.nextUrl.searchParams.get('orderId')
  if (!orderId) return NextResponse.json({ error: 'Missing order.' }, { status: 400 })

  const session = await getServerSession(authOptions)
  const staffRole = (session?.user as { role?: string } | undefined)?.role
  const officeSendRoles = new Set(['admin', 'manager', 'office', 'employee'])
  const staffAllowed = Boolean(session && officeSendRoles.has(String(staffRole || '')) && hasStaffPermission(staffRole, 'orders'))
  const driverAccess = staffAllowed ? null : await resolveDriverAccess(request)
  if (!staffAllowed && !driverAccess) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true, status: true, driverId: true, pickupDriverId: true,
      customer: { select: { firstName: true, phone: true } },
      items: { select: { itemName: true } },
    },
  })
  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
  if (['canceled', 'cancelled', 'quote', 'incomplete'].includes(order.status)) {
    return NextResponse.json({ error: 'Review requests are only available for real customer orders.' }, { status: 409 })
  }

  if (!staffAllowed && driverAccess && !driverAccess.isAdmin) {
    const assigned = order.driverId === driverAccess.driverId || order.pickupDriverId === driverAccess.driverId
    if (!assigned) return NextResponse.json({ error: 'This order is not assigned to you.' }, { status: 403 })
  }

  const to = normalizePhone(order.customer.phone)
  if (!to) return NextResponse.json({ error: 'This customer does not have a valid mobile number.' }, { status: 409 })
  const message = reviewMessage(order.customer.firstName, order.items.map((item) => item.itemName))
  const [latest, integration] = await Promise.all([
    prisma.textLog.findFirst({
      where: {
        toPhone: to,
        message: { contains: REVIEW_URL },
        status: { in: ['Prepared', 'Sent'] },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.integrationConnection.findUnique({
      where: { provider: 'textmessaging' },
      select: { isEnabled: true, apiKey: true, apiSecret: true, accountId: true },
    }),
  ])
  const providerConnected = Boolean(integration?.isEnabled && integration.apiKey && integration.apiSecret && integration.accountId)

  return NextResponse.json({
    success: true,
    to,
    message,
    providerConnected,
    reviewStatus: latest?.status || 'Not requested',
    lastReviewRequestAt: latest?.createdAt || null,
    reviewUrl: REVIEW_URL,
  })
}

export async function POST(request: NextRequest) {
  if (!REVIEW_URL) return NextResponse.json({ error: 'Google review profile is not configured for this location.' }, { status: 503 })
  let body: { orderId?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }) }
  if (!body.orderId) return NextResponse.json({ error: 'Missing order.' }, { status: 400 })

  const session = await getServerSession(authOptions)
  const staffRole = (session?.user as { role?: string } | undefined)?.role
  const officeSendRoles = new Set(['admin', 'manager', 'office', 'employee'])
  const staffAllowed = Boolean(session && officeSendRoles.has(String(staffRole || '')) && hasStaffPermission(staffRole, 'orders'))
  const driverAccess = staffAllowed ? null : await resolveDriverAccess(request)
  if (!staffAllowed && !driverAccess) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const order = await prisma.order.findUnique({
    where: { id: body.orderId },
    select: {
      id: true, orderNumber: true, status: true, driverId: true, pickupDriverId: true,
      customer: { select: { firstName: true, phone: true } },
      items: { select: { itemName: true } },
    },
  })
  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
  if (['canceled', 'cancelled', 'quote', 'incomplete'].includes(order.status)) {
    return NextResponse.json({ error: 'Review requests are only available for real customer orders.' }, { status: 409 })
  }

  if (!staffAllowed && driverAccess && !driverAccess.isAdmin) {
    const assigned = order.driverId === driverAccess.driverId || order.pickupDriverId === driverAccess.driverId
    if (!assigned) return NextResponse.json({ error: 'This order is not assigned to you.' }, { status: 403 })
  }

  const to = normalizePhone(order.customer.phone)
  if (!to) return NextResponse.json({ error: 'This customer does not have a valid mobile number.' }, { status: 409 })

  const message = reviewMessage(order.customer.firstName, order.items.map((item) => item.itemName))
  const recentlySent = await prisma.textLog.findFirst({
    where: {
      toPhone: to,
      message: { contains: REVIEW_URL },
      createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
      status: 'Sent',
    },
    orderBy: { createdAt: 'desc' },
  })
  if (recentlySent) return NextResponse.json({ error: 'A Google review request was already sent to this customer within the last 3 days.' }, { status: 409 })

  const recentlyPrepared = await prisma.textLog.findFirst({
    where: {
      toPhone: to,
      message: { contains: REVIEW_URL },
      createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
      status: 'Prepared',
    },
    orderBy: { createdAt: 'desc' },
  })

  const integration = await prisma.integrationConnection.findUnique({ where: { provider: 'textmessaging' } })
  if (!integration?.isEnabled || !integration.apiKey || !integration.apiSecret || !integration.accountId) {
    if (!recentlyPrepared) {
      await prisma.textLog.create({ data: { toPhone: to, message, status: 'Prepared' } })
    }
    return NextResponse.json({
      success: true,
      sent: false,
      composeSms: true,
      to,
      message,
      reviewUrl: REVIEW_URL,
      reviewProfileId: REVIEW_PROFILE_ID,
      reviewMapsCid: REVIEW_MAPS_CID,
    })
  }

  const from = normalizePhone(integration.accountId)
  if (!from) return NextResponse.json({ error: 'The Text Messaging sending number is invalid.' }, { status: 503 })

  const log = await prisma.textLog.create({ data: { toPhone: to, message, status: 'Sending' } })
  try {
    const params = new URLSearchParams({ To: to, From: from, Body: message })
    const auth = Buffer.from(`${integration.apiKey}:${integration.apiSecret}`).toString('base64')
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(integration.apiKey)}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      cache: 'no-store',
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      await prisma.textLog.update({ where: { id: log.id }, data: { status: 'Failed' } })
      return NextResponse.json({ error: result?.message || 'The review text could not be sent.' }, { status: 502 })
    }
    await prisma.textLog.update({ where: { id: log.id }, data: { status: 'Sent' } })
    return NextResponse.json({
      success: true,
      sent: true,
      composeSms: false,
      message: 'Google review request sent.',
      reviewUrl: REVIEW_URL,
      reviewProfileId: REVIEW_PROFILE_ID,
      reviewMapsCid: REVIEW_MAPS_CID,
    })
  } catch {
    await prisma.textLog.update({ where: { id: log.id }, data: { status: 'Failed' } })
    return NextResponse.json({ error: 'The review text could not be sent.' }, { status: 502 })
  }
}
