export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCronRequest } from '@/lib/cronAuth'
import { prisma } from '@/lib/prisma'
import { sendEmail, incompleteOrderRecaptureEmail } from '@/lib/email'
import { BUSINESS } from '@/lib/utils'
import { ownerNotificationRecipients } from '@/lib/orderLifecycleNotifications'
import { NYC_PUBLIC_ORIGIN } from '@/lib/nycPublicOrigin'

const SITE_URL = NYC_PUBLIC_ORIGIN

function resumeLink(orderId: string) {
    return SITE_URL + '/pay/' + orderId
}

function buildEmail(stage: 0 | 3 | 7, firstName: string, orderId: string) {
    const link = resumeLink(orderId)
    const name = firstName || 'there'
    if (stage === 0) {
        return {
            subject: 'Quick question about your event setup, ' + name,
            html: '<p>Hi ' + name + ',</p><p>I noticed you were exploring rental options with us for your event but didn\'t get a chance to finish your order. We know event planning keeps you busy, so if you have any questions or would like a hand finishing up, we\'re happy to help.</p><p>You can pick up right where you left off here:</p><p><a href="' + link + '">' + link + '</a></p><p>Thanks,<br/>The ' + BUSINESS.name + ' Team</p>',
        }
    }
    if (stage === 3) {
        return {
            subject: 'Checking in on your event quote, ' + name,
            html: '<p>Hi ' + name + ',</p><p>Just checking back on the quote you started for your upcoming event. Availability for your date and items can change, so if you\'d like to move forward, now is a great time to complete your booking.</p><p><a href="' + link + '">' + link + '</a></p><p>Thanks,<br/>The ' + BUSINESS.name + ' Team</p>',
        }
    }
    return {
        subject: 'Final check-in on your event quote, ' + name,
        html: '<p>Hi ' + name + ',</p><p>This is just a final check-in about the quote you started for your event. If you\'d still like to book, simply click below to complete your order. If your plans have changed, no action is needed on your end.</p><p><a href="' + link + '">' + link + '</a></p><p>Thanks,<br/>The ' + BUSINESS.name + ' Team</p>',
    }
}
async function hasAlreadyConverted(email: string, excludeOrderId: string) {
    const converted = await prisma.order.findFirst({ where: { id: { not: excludeOrderId }, customer: { email }, OR: [{ status: { notIn: ['quote','incomplete','draft','canceled','cancelled'] } }, { amountPaid: { gt: 0 } }] } })
    return !!converted
}

async function deliverRecoveryEmail(to: string | null | undefined, email: { subject: string; html: string }) {
    if (!to) return true
    try {
        const result = await sendEmail({ to, subject: email.subject, html: email.html })
        return result.success === true
    } catch {
        // Missing/failed SMTP must remain retryable and must never mark a reminder sent.
        return false
    }
}

export async function GET(request: NextRequest) {
  if (!(await isAuthorizedCronRequest(request, '.github/workflows/incomplete-orders-cron.yml'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

    const [stage0Setting, stage3Setting, stage7Setting] = await Promise.all([prisma.automaticMessage.findFirst({ where: { id: 'cmrcnccto0002uabltdx1eakk' } }), prisma.automaticMessage.findFirst({ where: { id: 'cmrcnccwv0003uablnwo23fgq' } }), prisma.automaticMessage.findFirst({ where: { id: 'cmrcncd030004uable6fvbdep' } })]); const stage0Enabled = stage0Setting?.enabled !== false; const stage3Enabled = stage3Setting?.enabled !== false; const stage7Enabled = stage7Setting?.enabled !== false; const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const results = { stage0: 0, stage3: 0, stage7: 0, retryableFailures: 0 }

    const stage0Orders = await prisma.order.findMany({
        where: {
            OR: [{ status: 'quote' }, { status: 'incomplete', checkoutStage: { in: ['payment_page','payment_started','abandoned'] } }],
            amountPaid: 0, source: { not: 'admin' },
            createdAt: { lte: oneHourAgo, gt: threeDaysAgo },
            incompleteFollowUpSentAt: null, followUpsPaused: false,
        },
        include: { customer: true },
    })
    for (const order of (stage0Enabled ? stage0Orders : [])) {
        if (order.customer?.email && await hasAlreadyConverted(order.customer.email, order.id)) { continue }
        const email = stage0Setting
            ? incompleteOrderRecaptureEmail({ subject: stage0Setting.subject, content: stage0Setting.content }, { firstName: order.customer?.firstName || '', orderId: order.id, resumeLink: resumeLink(order.id) })
            : buildEmail(0, order.customer?.firstName || '', order.id)
        const delivered = await deliverRecoveryEmail(order.customer?.email, email)
        if (!delivered) { results.retryableFailures++; continue }
            if (order.customer && order.source !== 'admin') {
                                try { await sendEmail({
                                                        to: ownerNotificationRecipients(),
                                                        subject: 'Abandoned online order - ' + (order.customer.firstName || 'Unknown') + ' ' + (order.customer.lastName || ''),
                                                        html: '<p>A customer started an order online but did not finish checking out.</p><p>Customer: ' + order.customer.firstName + ' ' + order.customer.lastName + '<br/>Email: ' + (order.customer.email || 'N/A') + '<br/>Phone: ' + (order.customer.phone || 'N/A') + '</p><p><a href="' + SITE_URL + '/admin/orders/' + order.id + '">View this order in the admin panel</a></p>',
                                }) } catch {}
            }
        await prisma.order.update({ where: { id: order.id }, data: { incompleteFollowUpSentAt: now, checkoutStage: order.status === 'incomplete' ? 'abandoned' : order.checkoutStage, checkoutLastSeenAt: order.checkoutLastSeenAt || order.updatedAt } })
        results.stage0++
    }

    const stage3Orders = await prisma.order.findMany({
        where: {
            OR: [{ status: 'quote' }, { status: 'incomplete', checkoutStage: { in: ['payment_page','payment_started','abandoned'] } }], amountPaid: 0, source: { not: 'admin' },
            createdAt: { lte: threeDaysAgo, gt: sevenDaysAgo },
            incompleteFollowUp3SentAt: null, followUpsPaused: false,
        },
        include: { customer: true },
    })
        for (const order of (stage3Enabled ? stage3Orders : [])) {
            if (order.customer?.email && await hasAlreadyConverted(order.customer.email, order.id)) { continue }
            if (order.incompleteFollowUpSentAt && order.incompleteFollowUpSentAt > oneDayAgo) { continue }
        const email = stage3Setting
            ? incompleteOrderRecaptureEmail({ subject: stage3Setting.subject, content: stage3Setting.content }, { firstName: order.customer?.firstName || '', orderId: order.id, resumeLink: resumeLink(order.id) })
            : buildEmail(3, order.customer?.firstName || '', order.id)
        const delivered = await deliverRecoveryEmail(order.customer?.email, email)
        if (!delivered) { results.retryableFailures++; continue }
        await prisma.order.update({ where: { id: order.id }, data: { incompleteFollowUpSentAt: order.incompleteFollowUpSentAt || now, incompleteFollowUp3SentAt: now, checkoutStage: order.status === 'incomplete' ? 'abandoned' : order.checkoutStage } })
        results.stage3++
    }

    const stage7Orders = await prisma.order.findMany({
        where: {
            OR: [{ status: 'quote' }, { status: 'incomplete', checkoutStage: { in: ['payment_page','payment_started','abandoned'] } }],
            amountPaid: 0, source: { not: 'admin' },
            createdAt: { lte: sevenDaysAgo, gt: fourteenDaysAgo },
            incompleteFollowUp7SentAt: null, followUpsPaused: false,
        },
        include: { customer: true },
    })
    for (const order of (stage7Enabled ? stage7Orders : [])) {
        if (order.customer?.email && await hasAlreadyConverted(order.customer.email, order.id)) { continue }
        if (order.incompleteFollowUp3SentAt && order.incompleteFollowUp3SentAt > oneDayAgo) { continue }
        const email = stage7Setting
            ? incompleteOrderRecaptureEmail({ subject: stage7Setting.subject, content: stage7Setting.content }, { firstName: order.customer?.firstName || '', orderId: order.id, resumeLink: resumeLink(order.id) })
            : buildEmail(7, order.customer?.firstName || '', order.id)
        const delivered = await deliverRecoveryEmail(order.customer?.email, email)
        if (!delivered) { results.retryableFailures++; continue }
        await prisma.order.update({ where: { id: order.id }, data: { incompleteFollowUpSentAt: order.incompleteFollowUpSentAt || now, incompleteFollowUp3SentAt: order.incompleteFollowUp3SentAt || now, incompleteFollowUp7SentAt: now, checkoutStage: order.status === 'incomplete' ? 'abandoned' : order.checkoutStage } })
        results.stage7++
    }

    return NextResponse.json({ ok: true, ...results })
}
