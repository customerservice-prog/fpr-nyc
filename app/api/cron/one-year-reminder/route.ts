export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, oneYearReminderEmail } from '@/lib/email'

// Automatic "book again" reminder email, sent a configurable number of days after the event
// date (per the daysToSend value on this automatic message, e.g. ~305 days later).
// Runs on a schedule (see .github/workflows/one-year-reminder-cron.yml).
// Only sends if the "1 Yr Reminder Letter" automatic message is enabled in admin settings.
// Uses the admin-authored subject/content directly, like the Pre-Rental Reminder Letter.
export async function GET(request: NextRequest) {
  // EMERGENCY KILL SWITCH - automatic sending paused by owner request, do not remove without explicit approval
  return NextResponse.json({ disabled: true, message: 'This automated email is temporarily disabled.' })

  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const setting = await prisma.automaticMessage.findFirst({
    where: { id: 'cmrcnccqh0001uablvgca3klw' },
  })
  if (!setting?.enabled) {
    return NextResponse.json({ skipped: true, reason: '1 Yr Reminder Letter automatic message is disabled' })
  }

    const daysToSend = setting!.daysToSend || 305
  const now = new Date()
  const startOfWindow = new Date(now)
  startOfWindow.setDate(startOfWindow.getDate() - daysToSend)
  startOfWindow.setHours(0, 0, 0, 0)
  const endOfWindow = new Date(startOfWindow)
  endOfWindow.setHours(23, 59, 59, 999)

  const orders = await prisma.order.findMany({
    where: {
      eventDate: { gte: startOfWindow, lte: endOfWindow },
      status: { not: 'canceled' },
      oneYearReminderSentAt: null,
    },
    include: { customer: true },
  })

    const url = new URL(request.url)
    const dryRun = url.searchParams.get('dryRun') === 'true'

    const results: any[] = []
  for (const order of orders) {
    const email = order.customer?.email || ''
    if (!email || email.includes('@imported.friendlypartyrental.local') || email.startsWith('no-email-')) {
      results.push({ orderId: order.id, orderNumber: order.orderNumber, skipped: true, reason: 'invalid or placeholder email' })
      continue
    }

    const customerName = `${order.customer.firstName} ${order.customer.lastName}`

    const emailContent = oneYearReminderEmail(
      { subject: setting!.subject, content: setting!.content },
      customerName
    )

    if (!dryRun) {
      await sendEmail({ to: email, subject: emailContent.subject, html: emailContent.html })

      await prisma.order.update({
        where: { id: order.id },
        data: { oneYearReminderSentAt: new Date() },
      })
    }

    results.push({ orderId: order.id, orderNumber: order.orderNumber, sent: !dryRun, dryRun, to: email })
  }

  return NextResponse.json({ dryRun, processed: results.length, results })
    }
