export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, preRentalReminderEmail } from '@/lib/email'

// Automatic 1-day-before-event Pre-Rental Reminder email (covers both delivery and pickup orders).
// Runs on a schedule (see .github/workflows/pre-rental-reminder-cron.yml).
// Only sends if the "Pre-Rental Reminder Letter" automatic message is enabled in admin settings.
// Note: unlike the other reminder emails, this uses the admin-authored subject/content directly
// (with [Order ID] substituted) rather than a fixed template in code.
export async function GET(request: NextRequest) {
  // EMERGENCY KILL SWITCH - automatic sending paused by owner request, do not remove without explicit approval
  return NextResponse.json({ disabled: true, message: 'This automated email is temporarily disabled.' })

  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const setting = await prisma.automaticMessage.findFirst({
    where: { id: 'cmrcnccnf0000uabl9onacjbk' },
  })
  if (!setting?.enabled) {
    return NextResponse.json({ skipped: true, reason: 'Pre-Rental Reminder Letter automatic message is disabled' })
  }

  const now = new Date()
  const startOfWindow = new Date(now)
  startOfWindow.setDate(startOfWindow.getDate() + 1)
  startOfWindow.setHours(0, 0, 0, 0)
  const endOfWindow = new Date(startOfWindow)
  endOfWindow.setHours(23, 59, 59, 999)

  const orders = await prisma.order.findMany({
    where: {
      eventDate: { gte: startOfWindow, lte: endOfWindow },
      status: { not: 'canceled' },
      preRentalReminderSentAt: null,
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

    const emailContent = preRentalReminderEmail(
      { subject: setting!.subject, content: setting!.content },
      { orderNumber: order.orderNumber }
    )

    if (!dryRun) {
      await sendEmail({ to: email, subject: emailContent.subject, html: emailContent.html })

      await prisma.order.update({
        where: { id: order.id },
        data: { preRentalReminderSentAt: new Date() },
      })
    }

    results.push({ orderId: order.id, orderNumber: order.orderNumber, sent: !dryRun, dryRun, to: email })
  }

  return NextResponse.json({ dryRun, processed: results.length, results })
}
