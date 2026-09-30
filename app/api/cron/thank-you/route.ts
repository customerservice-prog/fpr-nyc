export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCronRequest } from '@/lib/cronAuth'
import { prisma } from '@/lib/prisma'
import { sendEmail, thankYouEmail } from '@/lib/email'

// Automatic 1-day-after-event-ends Thank You email.
// Runs on a schedule (see .github/workflows/thank-you-cron.yml).
// Only sends if the "Thank You Email" automatic message is enabled in admin settings.
export async function GET(request: NextRequest) {

  if (!(await isAuthorizedCronRequest(request, '.github/workflows/thank-you-cron.yml'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const setting = await prisma.automaticMessage.findFirst({
    where: { id: 'automsg_thank_you' },
  })
  if (!setting?.enabled) {
    return NextResponse.json({ skipped: true, reason: 'Thank You automatic message is disabled' })
  }

  const now = new Date()
  const startOfWindow = new Date(now)
  startOfWindow.setDate(startOfWindow.getDate() - 1)
  startOfWindow.setHours(0, 0, 0, 0)
  const endOfWindow = new Date(startOfWindow)
  endOfWindow.setHours(23, 59, 59, 999)

  const orders = await prisma.order.findMany({
    where: {
      eventEndDate: { gte: startOfWindow, lte: endOfWindow },
      status: { not: 'canceled' },
      thankYouSentAt: null,
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

    const emailContent = thankYouEmail({
      orderNumber: order.orderNumber,
      customerName,
    })

    if (!dryRun) {
      await sendEmail({ to: email, subject: emailContent.subject, html: emailContent.html })

      await prisma.order.update({
        where: { id: order.id },
        data: { thankYouSentAt: new Date() },
      })
    }

    results.push({ orderId: order.id, orderNumber: order.orderNumber, sent: !dryRun, dryRun, to: email })
  }

  return NextResponse.json({ dryRun, processed: results.length, results })
}
