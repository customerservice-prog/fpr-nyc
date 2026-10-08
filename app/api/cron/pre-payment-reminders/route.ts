export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCronRequest } from '@/lib/cronAuth'
import { prisma } from '@/lib/prisma'
import { sendEmail, prePaymentReminderEmail } from '@/lib/email'
import { customerPayUrl } from '@/lib/publicOrderAccess'

// Automatic 3-day-before-event Pre-Payment Reminder email.
// Runs on a schedule (see .github/workflows/pre-payment-reminders-cron.yml).
// Only sends if the "Pre-Pay Letter" automatic message is enabled in admin settings,
// and skips any order that has the per-order prePayReminderDisabled override set.
export async function GET(request: NextRequest) {
  if (!(await isAuthorizedCronRequest(request, '.github/workflows/pre-payment-reminders-cron.yml'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const origin = process.env.NEXTAUTH_URL || request.nextUrl.origin

  const setting = await prisma.automaticMessage.findFirst({
    where: { id: 'automsg_prepay_letter' },
  })
  if (!setting || !setting.enabled) {
    return NextResponse.json({ skipped: true, reason: 'Pre-Pay Letter automatic message is disabled' })
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
      status: { notIn: ['canceled', 'quote'] },
      prePayReminderSentAt: null,
      prePayReminderDisabled: false,
    },
    include: { customer: true },
  })

  const results: any[] = []

  for (const order of orders.filter((o) => Math.max((o.totalAmount || 0) - (o.amountPaid || 0), 0) > 0)) {
    const email = order.customer?.email || ''
    if (!email || email.includes('@imported.friendlypartyrental.local') || email.startsWith('no-email-')) {
      results.push({ orderId: order.id, orderNumber: order.orderNumber, skipped: true, reason: 'invalid or placeholder email' })
      continue
    }

    const payLink = customerPayUrl(origin, order.id, order.eventDate)

        const emailContent = prePaymentReminderEmail(
          { subject: setting.subject, content: setting.content },
          { orderNumber: order.orderNumber, payLink }
              )

    await sendEmail({ to: email, subject: emailContent.subject, html: emailContent.html })

    await prisma.order.update({
      where: { id: order.id },
      data: { prePayReminderSentAt: new Date() },
    })
      
    results.push({ orderId: order.id, orderNumber: order.orderNumber, sent: true, to: email })
  }

  return NextResponse.json({ processed: results.length, results })
}
