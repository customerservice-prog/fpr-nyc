export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, balanceReminderEmail } from '@/lib/email'
import { formatDate } from '@/lib/utils'
import { customerPayUrl } from '@/lib/publicOrderAccess'

// Automatic 3-day-before-event Balance Reminder email.
// Runs on a schedule (see .github/workflows/balance-reminder-cron.yml).
// Only sends if the "Balance Reminder Email" automatic message is enabled in admin settings.
export async function GET(request: NextRequest) {
  // EMERGENCY KILL SWITCH - automatic sending paused by owner request, do not remove without explicit approval
  return NextResponse.json({ disabled: true, message: 'This automated email is temporarily disabled.' })

  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const origin = process.env.NEXTAUTH_URL || request.nextUrl.origin

  const setting = await prisma.automaticMessage.findFirst({
    where: { id: 'automsg_balance_reminder' },
  })
  if (!setting?.enabled) {
    return NextResponse.json({ skipped: true, reason: 'Balance Reminder automatic message is disabled' })
  }

  const now = new Date()
  const startOfWindow = new Date(now)
  startOfWindow.setDate(startOfWindow.getDate() + 3)
  startOfWindow.setHours(0, 0, 0, 0)
  const endOfWindow = new Date(startOfWindow)
  endOfWindow.setHours(23, 59, 59, 999)

  const orders = await prisma.order.findMany({
    where: {
      eventDate: { gte: startOfWindow, lte: endOfWindow },
      status: { not: 'canceled' },
      
      balanceReminderSentAt: null,
    },
    include: { customer: true },
  })

  const url = new URL(request.url)
  const dryRun = url.searchParams.get('dryRun') === 'true'

  const results: any[] = []

  for (const order of orders.filter((o) => Math.max((o.totalAmount || 0) - (o.amountPaid || 0), 0) > 0)) {
    const email = order.customer?.email || ''
    if (!email || email.includes('@imported.friendlypartyrental.local') || email.startsWith('no-email-')) {
      results.push({ orderId: order.id, orderNumber: order.orderNumber, skipped: true, reason: 'invalid or placeholder email' })
      continue
    }

    const payLink = customerPayUrl(origin, order.id, order.eventDate)
    const customerName = `${order.customer.firstName} ${order.customer.lastName}`
    const eventDate = formatDate(order.eventDate)

    const emailContent = balanceReminderEmail({
      orderNumber: order.orderNumber,
      customerName,
      eventDate,
      eventAddress: order.eventAddress,
      eventCity: order.eventCity,
      eventState: order.eventState,
      eventZip: order.eventZip,
      balanceDue: Math.max((order.totalAmount || 0) - (order.amountPaid || 0), 0),
      payLink,
    })

    if (!dryRun) {
      await sendEmail({ to: email, subject: emailContent.subject, html: emailContent.html })

      await prisma.order.update({
        where: { id: order.id },
        data: { balanceReminderSentAt: new Date() },
      })
    }

    results.push({ orderId: order.id, orderNumber: order.orderNumber, sent: !dryRun, dryRun, to: email })
  }

  return NextResponse.json({ dryRun, processed: results.length, results })
}
