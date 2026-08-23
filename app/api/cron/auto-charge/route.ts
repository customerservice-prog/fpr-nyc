export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { finalizePayment } from '@/lib/payments'
import { sendEmail } from '@/lib/email'
import { BUSINESS } from '@/lib/utils'

// Automatic pre-event card charge (Autopay).
// Charges customers who opted in at checkout to save their card and have
// their remaining balance charged automatically before their event.
// Runs on a schedule (see .github/workflows/auto-charge-cron.yml).
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 400 })
  }

  const settings = await prisma.autoChargeSettings.findFirst()
  if (!settings || !settings.enabled) {
    return NextResponse.json({ skipped: true, reason: 'Auto charge disabled' })
  }

  const daysBefore = settings.daysBeforeEvent || 3
  const targetStart = new Date()
  targetStart.setDate(targetStart.getDate() + daysBefore)
  targetStart.setHours(0, 0, 0, 0)
  const targetEnd = new Date(targetStart)
  targetEnd.setHours(23, 59, 59, 999)

  const orders = await prisma.order.findMany({
    where: {
      autopayEnabled: true,
      savedPaymentMethodId: { not: null },
      stripeCustomerId: { not: null },
      eventDate: { gte: targetStart, lte: targetEnd },
      balanceDue: { gt: 0 },
      status: { notIn: ['canceled'] },
      autoChargeAttemptedAt: null,
    },
    include: { customer: true },
  })

  const results: Array<{ orderId: string; orderNumber: string; status: string; amount?: number; error?: string }> = []

  for (const order of orders) {
    const chargeAmount = settings.chargeRemainingBalance
      ? order.balanceDue
      : Math.min(order.depositAmount || order.balanceDue, order.balanceDue)

    if (!chargeAmount || chargeAmount <= 0) continue

    try {
      const intent = await stripe.paymentIntents.create({
        amount: Math.round(chargeAmount * 100),
        currency: 'usd',
        customer: order.stripeCustomerId as string,
        payment_method: order.savedPaymentMethodId as string,
        off_session: true,
        confirm: true,
        metadata: { orderId: order.id, orderNumber: order.orderNumber, autoCharge: 'true' },
      })

      await finalizePayment({
        orderId: order.id,
        amount: chargeAmount,
        stripePaymentId: intent.id,
        method: 'card',
        notes: 'Autopay - automatic charge before event',
      })

      await prisma.order.update({
        where: { id: order.id },
        data: { autoChargeStatus: 'succeeded', autoChargeAttemptedAt: new Date() },
      })

      results.push({ orderId: order.id, orderNumber: order.orderNumber, status: 'succeeded', amount: chargeAmount })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('Auto charge failed for order', order.id, err)

      await prisma.order.update({
        where: { id: order.id },
        data: { autoChargeStatus: 'failed', autoChargeAttemptedAt: new Date() },
      })

      results.push({ orderId: order.id, orderNumber: order.orderNumber, status: 'failed', error: message })

      if (settings.notifyCustomer && order.customer?.email) {
        try {
          await sendEmail({
            to: order.customer.email,
            subject: `Action needed: Autopay charge failed for order ${order.orderNumber}`,
            html: `<p>Hi ${order.customer.firstName},</p><p>We tried to automatically charge your card on file for the remaining balance on order ${order.orderNumber}, but the charge did not go through. Please contact us or use your payment link to complete payment before your event.</p>`,
          })
        } catch (emailErr) {
          console.error('Auto charge failure email error:', emailErr)
        }
      }

      try {
        await sendEmail({
          to: BUSINESS.email,
          subject: `[Autopay Failed] Order ${order.orderNumber}`,
          html: `<p>Autopay charge failed for order ${order.orderNumber} (customer: ${order.customer?.firstName} ${order.customer?.lastName}). Error: ${message}</p>`,
        })
      } catch (emailErr) {
        console.error('Auto charge admin notify email error:', emailErr)
      }
    }
  }

  return NextResponse.json({ processed: orders.length, results })
}
