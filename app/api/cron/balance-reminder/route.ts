export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCronRequest } from '@/lib/cronAuth'
import { prisma } from '@/lib/prisma'
import { sendEmail, balanceReminderEmail } from '@/lib/email'
import { formatDate } from '@/lib/utils'
import { isNycPublicBookingDateOpen } from '@/lib/nycBookingWindow'
import { balanceReminderWindow, isBalanceReminderEligible } from '@/lib/nycBalanceReminder'

export async function GET(request: NextRequest) {
  if (!(await isAuthorizedCronRequest(request, '.github/workflows/balance-reminder-cron.yml'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const setting = await prisma.automaticMessage.findUnique({ where: { id: 'automsg_balance_reminder' } })
  if (!setting?.enabled) return NextResponse.json({ skipped: true, reason: 'Balance reminder disabled in settings' })

  // Remain in dry-run mode until the production build and end-to-end email path
  // have been tested. Idempotency is required and SMTP fallback is disabled.
  const dryRun = process.env.NYC_BALANCE_REMINDERS_ENABLED !== 'true' || request.nextUrl.searchParams.get('dryRun') === 'true'
  const { start, end } = balanceReminderWindow(new Date())
  const orders = await prisma.order.findMany({
    where: { eventDate: { gte: start, lt: end }, status: 'active', followUpsPaused: false, balanceReminderSentAt: null },
    include: { customer: true },
  })

  let eligible = 0, sent = 0, failed = 0
  for (const order of orders) {
    if (!isBalanceReminderEligible(order, isNycPublicBookingDateOpen(order.eventDate))) continue
    const email = order.customer?.email?.trim() || ''
    if (!email || email.includes('@imported.friendlypartyrental.local') || email.startsWith('no-email-')) continue
    eligible++
    if (dryRun) continue

    const payLink = `${process.env.NEXTAUTH_URL || request.nextUrl.origin}/pay/${order.id}`
    const message = balanceReminderEmail({
      orderNumber: order.orderNumber,
      customerName: `${order.customer.firstName} ${order.customer.lastName}`,
      eventDate: formatDate(order.eventDate),
      eventAddress: order.eventAddress,
      eventCity: order.eventCity,
      eventState: order.eventState,
      eventZip: order.eventZip,
      balanceDue: Math.max(order.totalAmount - order.amountPaid, 0),
      payLink,
    })
    try {
      await sendEmail({ to: email, subject: message.subject, html: message.html, idempotencyKey: `nyc-balance-reminder/${order.id}/${order.eventDate.toISOString().slice(0, 10)}` })
      await prisma.order.update({ where: { id: order.id }, data: { balanceReminderSentAt: new Date() } })
      sent++
    } catch (error) {
      console.error('NYC balance reminder failed for order', order.id, error instanceof Error ? error.message : 'Unknown error')
      failed++
    }
  }
  return NextResponse.json({ dryRun, eligible, sent, failed }, { status: failed ? 500 : 200 })
}
