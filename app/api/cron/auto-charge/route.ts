export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCronRequest } from '@/lib/cronAuth'
import { prisma } from '@/lib/prisma'
import { describeStripeError, isNycPaymentsUnavailable, requireNycStripe } from '@/lib/stripe'
import { sendEmail } from '@/lib/email'
import { BUSINESS } from '@/lib/utils'
import { buildNycPaymentMetadata, nycIdempotencyKey } from '@/lib/nycPaymentMetadata'
import { toCents } from '@/lib/nycCheckoutPricing'
import { alertOwner, recordSucceededIntent } from '@/lib/nycStripeReconcile'

// Automatic pre-event card charge (Autopay).
// Charges customers who opted in at checkout to save their card and have
// their remaining balance charged automatically before their event.
// Runs on a schedule (see .github/workflows/auto-charge-cron.yml).
//
// Safeguards: NYC account guard + go-live switch, each order is claimed atomically
// before charging (overlapping cron runs cannot both charge it), a per-order Stripe
// idempotency key, and a successful charge that fails to record is reported to the
// owner as "charged, not recorded" instead of telling the customer it failed.
export async function GET(request: NextRequest) {
  if (!(await isAuthorizedCronRequest(request, '.github/workflows/auto-charge-cron.yml'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const settings = await prisma.autoChargeSettings.findFirst()
  if (!settings || !settings.enabled) {
    return NextResponse.json({ skipped: true, reason: 'Auto charge disabled' })
  }

  let stripe: Awaited<ReturnType<typeof requireNycStripe>>
  try {
    stripe = await requireNycStripe('charge')
  } catch (error) {
    if (isNycPaymentsUnavailable(error)) return NextResponse.json({ skipped: true, reason: 'NYC online payments are not enabled: ' + error.reason })
    throw error
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
      status: { notIn: ['canceled'] },
      autoChargeAttemptedAt: null,
    },
    include: { customer: true },
  })

  const results: Array<{ orderId: string; orderNumber: string; status: string; amount?: number; error?: string }> = []

  for (const order of orders) {
    const remainingCents = Math.max(toCents(order.totalAmount || 0) - toCents(order.amountPaid || 0), 0)
    const chargeCents = settings.chargeRemainingBalance
      ? remainingCents
      : Math.min(order.depositAmount ? toCents(order.depositAmount) : remainingCents, remainingCents)
    if (chargeCents < 50) continue

    // Claim the order before charging so a concurrent run skips it.
    const claim = await prisma.order.updateMany({
      where: { id: order.id, autoChargeAttemptedAt: null },
      data: { autoChargeAttemptedAt: new Date(), autoChargeStatus: 'processing' },
    })
    if (claim.count !== 1) continue

    let intentId: string | null = null
    try {
      const intent = await stripe.paymentIntents.create({
        amount: chargeCents,
        currency: 'usd',
        customer: order.stripeCustomerId as string,
        payment_method: order.savedPaymentMethodId as string,
        off_session: true,
        confirm: true,
        description: 'Friendly Party Rental NYC order ' + order.orderNumber + ' - autopay balance',
        metadata: buildNycPaymentMetadata({ orderId: order.id, orderNumber: order.orderNumber, kind: 'autopay', principalCents: chargeCents, tipCents: 0 }),
      }, { idempotencyKey: nycIdempotencyKey(['autopay', order.id, chargeCents]) })
      intentId = intent.id

      if (intent.status === 'processing') {
        await prisma.order.update({ where: { id: order.id }, data: { autoChargeStatus: 'processing' } })
        results.push({ orderId: order.id, orderNumber: order.orderNumber, status: 'processing', amount: chargeCents / 100 })
        continue
      }
      if (intent.status !== 'succeeded') throw Object.assign(new Error('PaymentIntent status ' + intent.status), { autopayNotCharged: true })

      try {
        await recordSucceededIntent(intent, { notes: 'Autopay - automatic charge before event' })
      } catch (recordError) {
        // The card WAS charged. Never tell the customer it failed; the webhook or staff sync will record it.
        console.error('[auto-charge] Charged but not recorded for order', order.id, recordError)
        await prisma.order.update({ where: { id: order.id }, data: { autoChargeStatus: 'charged_unrecorded' } })
        await alertOwner(`Autopay charged but not recorded: order ${order.orderNumber}`, [
          `Stripe PaymentIntent ${intent.id} succeeded for $${(chargeCents / 100).toFixed(2)} but the order could not be updated automatically.`,
          'Use "Sync Payment Status" on the order to record it. Do not charge the customer again.',
        ])
        results.push({ orderId: order.id, orderNumber: order.orderNumber, status: 'charged_unrecorded', amount: chargeCents / 100 })
        continue
      }

      await prisma.order.update({ where: { id: order.id }, data: { autoChargeStatus: 'succeeded' } })
      results.push({ orderId: order.id, orderNumber: order.orderNumber, status: 'succeeded', amount: chargeCents / 100 })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('[auto-charge] Charge failed for order', order.id, describeStripeError(err), intentId || '')

      await prisma.order.update({
        where: { id: order.id },
        data: { autoChargeStatus: 'failed' },
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
