export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { marketingTrend } from '@/lib/marketing/reporting'
import { getAutopilotConfig, hasCurrentApproval } from '@/lib/marketing/autopilotSettings'
import { autopilotReadiness } from '@/lib/marketing/autopilot'
import { marketingTransportStatus } from '@/lib/marketing/delivery'
import { dailyMarketingUsage } from '@/lib/marketing/queue'

async function sendingStatus(now: Date) {
  try {
    const config = await getAutopilotConfig()
    const [readiness, usage] = await Promise.all([autopilotReadiness(config, now), dailyMarketingUsage(now)])
    const approved = hasCurrentApproval(config, marketingTransportStatus().senderDomain)
    return { available: true, mode: config.mode, approved, ready: readiness.ready, dailyLimit: config.dailyLimit,
      usedToday: usage.used, remainingToday: Math.max(0, config.dailyLimit - usage.used), pauseReason: config.pauseReason,
      checks: readiness.checks, asOf: now.toISOString() }
  } catch {
    return { available: false, asOf: now.toISOString() }
  }
}

const DAY_MS = 24 * 60 * 60 * 1000
const ATTRIBUTION_WINDOW_DAYS = 30

function money(n: number) {
  return Math.round((Number(n) || 0) * 100) / 100
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const rawDays = Number(new URL(request.url).searchParams.get('days') || 30)
    const days = [7, 30, 90, 365].includes(rawDays) ? rawDays : 30
    const now = new Date()
    const start = new Date(now.getTime() - days * DAY_MS)

    const runWhere = { createdAt: { gte: start, lte: now } }
    const [sendLogs, runs, runSums, delivery] = await Promise.all([
      prisma.marketingSendLog.findMany({
        where: { sentAt: { gte: start, lte: now }, channel: 'email' },
        orderBy: { sentAt: 'asc' },
        select: { id: true, campaignSlug: true, campaignName: true, email: true, sentAt: true, runId: true, openedAt: true, openCount: true, clickedAt: true, clickCount: true },
      }),
      prisma.marketingRun.findMany({
        where: { createdAt: { gte: start, lte: now } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true, campaignSlug: true, campaignName: true, subject: true, mode: true, segment: true,
          status: true, createdAt: true, startedAt: true, completedAt: true, resolvedAudienceCount: true,
          claimedCount: true, sentCount: true, failedCount: true, suppressedCount: true,
          duplicateBlockedCount: true, simulatedCount: true, initiatedByName: true, errorMessage: true,
        },
      }),
      prisma.marketingRun.aggregate({
        where: runWhere,
        _sum: { failedCount: true, suppressedCount: true, duplicateBlockedCount: true, simulatedCount: true },
      }),
      sendingStatus(now),
    ])

    const normalizedEmails = Array.from(new Set(sendLogs.map((s) => s.email.trim().toLowerCase()).filter(Boolean)))
    const customers = normalizedEmails.length
      ? await prisma.customer.findMany({
          where: { email: { in: normalizedEmails, mode: 'insensitive' } },
          select: {
            id: true, email: true,
            orders: {
              where: {
                status: { notIn: ['canceled', 'cancelled', 'quote', 'draft', 'incomplete'] },
                createdAt: { gte: start, lte: now },
              },
              select: { id: true, orderNumber: true, createdAt: true, totalAmount: true, amountPaid: true, status: true },
            },
          },
        })
      : []

    const sendsByEmail = new Map<string, typeof sendLogs>()
    for (const send of sendLogs) {
      const key = send.email.trim().toLowerCase()
      const arr = sendsByEmail.get(key) || []
      arr.push(send)
      sendsByEmail.set(key, arr)
    }

    type Attribution = {
      recipient: string
      orderId: string
      orderNumber: string
      orderCreatedAt: Date
      campaignSlug: string
      campaignName: string
      sendId: string
      sentAt: Date
      bookedRevenue: number
      collectedRevenue: number
    }
    const attributions: Attribution[] = []

    for (const customer of customers) {
      const email = customer.email.trim().toLowerCase()
      const priorSends = sendsByEmail.get(email) || []
      if (!priorSends.length) continue
      for (const order of customer.orders) {
        const orderMs = order.createdAt.getTime()
        const windowStart = orderMs - ATTRIBUTION_WINDOW_DAYS * DAY_MS
        let winner: (typeof priorSends)[number] | null = null
        for (const send of priorSends) {
          const sendMs = send.sentAt.getTime()
          if (sendMs <= orderMs && sendMs >= windowStart && (!winner || sendMs > winner.sentAt.getTime())) winner = send
        }
        if (!winner) continue
        attributions.push({
          recipient: email,
          orderId: order.id,
          orderNumber: order.orderNumber,
          orderCreatedAt: order.createdAt,
          campaignSlug: winner.campaignSlug,
          campaignName: winner.campaignName,
          sendId: winner.id,
          sentAt: winner.sentAt,
          bookedRevenue: money(order.totalAmount),
          collectedRevenue: money(order.amountPaid),
        })
      }
    }

    const uniqueRecipients = new Set(normalizedEmails).size
    const emailsOpened = sendLogs.filter((s) => s.openCount > 0).length
    const emailsClicked = sendLogs.filter((s) => s.clickCount > 0).length
    const totalOpenEvents = sendLogs.reduce((sum, s) => sum + (s.openCount || 0), 0)
    const totalClickEvents = sendLogs.reduce((sum, s) => sum + (s.clickCount || 0), 0)
    const openRate = sendLogs.length ? Math.round((emailsOpened / sendLogs.length) * 10000) / 100 : 0
    const clickRate = sendLogs.length ? Math.round((emailsClicked / sendLogs.length) * 10000) / 100 : 0
    const bookedRevenue = money(attributions.reduce((s, a) => s + a.bookedRevenue, 0))
    const collectedRevenue = money(attributions.reduce((s, a) => s + a.collectedRevenue, 0))
    const convertedRecipients = new Set(attributions.map(a => a.recipient)).size
    const conversionRate = uniqueRecipients ? Math.round((convertedRecipients / uniqueRecipients) * 10000) / 100 : 0

    const campaignMap = new Map<string, {
      slug: string; name: string; sends: number; recipients: Set<string>; convertedRecipients: Set<string>; openedRecipients: Set<string>; clickedRecipients: Set<string>; totalOpenEvents: number; totalClickEvents: number; bookings: number; bookedRevenue: number; collectedRevenue: number; lastSentAt: Date | null
    }>()
    for (const send of sendLogs) {
      const key = send.campaignSlug || send.campaignName
      let row = campaignMap.get(key)
      if (!row) {
        row = { slug: send.campaignSlug, name: send.campaignName, sends: 0, recipients: new Set(), convertedRecipients: new Set(), openedRecipients: new Set(), clickedRecipients: new Set(), totalOpenEvents: 0, totalClickEvents: 0, bookings: 0, bookedRevenue: 0, collectedRevenue: 0, lastSentAt: null }
        campaignMap.set(key, row)
      }
      row.sends += 1
      const sendEmail = send.email.trim().toLowerCase()
      row.recipients.add(sendEmail)
      if (send.openCount > 0) row.openedRecipients.add(send.id)
      if (send.clickCount > 0) row.clickedRecipients.add(send.id)
      row.totalOpenEvents += send.openCount || 0
      row.totalClickEvents += send.clickCount || 0
      if (!row.lastSentAt || send.sentAt > row.lastSentAt) row.lastSentAt = send.sentAt
    }
    for (const a of attributions) {
      const key = a.campaignSlug || a.campaignName
      const row = campaignMap.get(key)
      if (!row) continue
      row.bookings += 1
      row.convertedRecipients.add(a.recipient)
      row.bookedRevenue = money(row.bookedRevenue + a.bookedRevenue)
      row.collectedRevenue = money(row.collectedRevenue + a.collectedRevenue)
    }

    const campaigns = Array.from(campaignMap.values()).map((row) => ({
      slug: row.slug,
      name: row.name,
      sends: row.sends,
      uniqueRecipients: row.recipients.size,
      opens: row.openedRecipients.size,
      clicks: row.clickedRecipients.size,
      totalOpenEvents: row.totalOpenEvents,
      totalClickEvents: row.totalClickEvents,
      openRate: row.sends ? Math.round((row.openedRecipients.size / row.sends) * 10000) / 100 : 0,
      clickRate: row.sends ? Math.round((row.clickedRecipients.size / row.sends) * 10000) / 100 : 0,
      bookings: row.bookings,
      bookedRevenue: money(row.bookedRevenue),
      collectedRevenue: money(row.collectedRevenue),
      convertedRecipients: row.convertedRecipients.size,
      conversionRate: row.recipients.size ? Math.round((row.convertedRecipients.size / row.recipients.size) * 10000) / 100 : 0,
      lastSentAt: row.lastSentAt,
    })).sort((a, b) => b.bookedRevenue - a.bookedRevenue || b.sends - a.sends)


    return NextResponse.json({
      range: { days, start, end: now, attributionWindowDays: ATTRIBUTION_WINDOW_DAYS },
      delivery,
      summary: {
        emailsSent: sendLogs.length,
        uniqueRecipients,
        campaignsSent: campaigns.length,
        bookingsAttributed: attributions.length,
        bookedRevenue,
        collectedRevenue,
        convertedRecipients,
        conversionRate,
        failedSends: runSums._sum.failedCount || 0,
        suppressedSends: runSums._sum.suppressedCount || 0,
        duplicateBlocked: runSums._sum.duplicateBlockedCount || 0,
        simulatedSends: runSums._sum.simulatedCount || 0,
        emailsOpened,
        emailsClicked,
        totalOpenEvents,
        totalClickEvents,
        openRate,
        clickRate,
        engagementTrackingAvailable: true,
      },
      campaigns,
      trend: marketingTrend(sendLogs, start, now),
      recentRuns: runs.slice(0, 20),
      recentAttributions: attributions.sort((a, b) => b.orderCreatedAt.getTime() - a.orderCreatedAt.getTime()).slice(0, 20).map(({ recipient, ...attribution }) => attribution),
      methodology: `Last-touch email attribution: an order is attributed to the most recent successful marketing email sent to the customer's email address within ${ATTRIBUTION_WINDOW_DAYS} days before the order was created. Only successful emails sent within the selected range are included, along with subsequent bookings made by today within that window. Quotes, drafts, incomplete and canceled orders are excluded. Conversion counts unique recipients who booked. Collected revenue is the current net amount paid on those orders, not cash received during the selected dates. Email attribution is an estimate, not proof that an email caused a booking. Recorded opens and clicks can include automated privacy tools and security scanners; successful sending does not guarantee inbox placement.`,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Marketing performance error:', error)
    return NextResponse.json({ error: 'Failed to load marketing performance' }, { status: 500 })
  }
}


