export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail, prePaymentReminderEmail } from '@/lib/email'
import { formatDate } from '@/lib/utils'

// One-time, manually-triggered batch sender for the 3-day pre-payment reminder.
// Only processes the exact orderIds passed in the request body. Never runs on a schedule.
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as { role?: string }).role !== 'admin') {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

  const body = await request.json()
    const orderIds: string[] = Array.isArray(body.orderIds) ? body.orderIds : []
        const dryRun = body.dryRun !== false

  if (orderIds.length === 0) {
        return NextResponse.json({ error: 'No orderIds provided' }, { status: 400 })
  }

  const origin = process.env.NEXTAUTH_URL || request.nextUrl.origin
    const results: any[] = []

        for (const id of orderIds) {
              const order = await prisma.order.findUnique({
                      where: { id },
                      include: { customer: true },
              })

      if (!order) {
              results.push({ orderId: id, skipped: true, reason: 'not found' })
              continue
      }

      if (order.status === 'canceled') {
              results.push({ orderId: id, orderNumber: order.orderNumber, skipped: true, reason: 'canceled' })
              continue
      }

      if (!order.balanceDue || order.balanceDue <= 0) {
              results.push({ orderId: id, orderNumber: order.orderNumber, skipped: true, reason: 'no balance due' })
              continue
      }

      const email = order.customer?.email || ''
              if (!email || email.includes('@imported.friendlypartyrental.local') || email.startsWith('no-email-')) {
                      results.push({ orderId: id, orderNumber: order.orderNumber, skipped: true, reason: 'invalid or placeholder email' })
                      continue
              }

      const payLink = `${origin}/pay/${order.id}`
            const contractLink = origin + '/contract/' + order.id
              const customerName = `${order.customer.firstName} ${order.customer.lastName}`
              const eventDate = formatDate(order.eventDate)

      const emailContent = prePaymentReminderEmail({
              orderNumber: order.orderNumber,
              customerName,
              eventDate,
              eventAddress: order.eventAddress,
              eventCity: order.eventCity,
              eventState: order.eventState,
              eventZip: order.eventZip,
              deliveryType: order.deliveryType,
              eventTimeSlot: order.eventTimeSlot,
              pickupTimeSlot: order.pickupTimeSlot,
              balanceDue: order.balanceDue,
              payLink,
          contractLink,
      })

      if (dryRun) {
              results.push({
                        orderId: id,
                        orderNumber: order.orderNumber,
              customerName,
                        to: email,
                        subject: emailContent.subject,
                        balanceDue: order.balanceDue,
                        payLink,
                        dryRun: true,
              })
              continue
      }

      const sendResult = await sendEmail({
              to: email,
              subject: emailContent.subject,
              html: emailContent.html,
      })

      results.push({
              orderId: id,
              orderNumber: order.orderNumber,
              customerName,
              to: email,
              balanceDue: order.balanceDue,
              sent: sendResult.success,
              simulated: (sendResult as any).simulated || false,
      })
        }

  return NextResponse.json({ dryRun, count: results.length, results })
}
