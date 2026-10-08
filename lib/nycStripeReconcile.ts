import type Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { finalizePayment } from '@/lib/payments'
import { sendEmail } from '@/lib/email'
import { ownerNotificationRecipients } from '@/lib/orderLifecycleNotifications'
import { checkNycPaymentMetadata } from '@/lib/nycPaymentMetadata'
import { livemodeMatches } from '@/lib/nycStripeGuard'
import { nycStripeMode } from '@/lib/stripe'
import { PAYMENT_CARD_AUTHORIZATION_VERSION } from '@/lib/cardAuthorization'

// Shared reconciliation used by the webhook, the confirmation page, and the staff
// "Sync Payment Status" action. Every path re-reads the PaymentIntent from the
// NYC Stripe account (via a client returned by requireNycStripe) and validates
// the server-generated metadata before touching the database.

export type ReconcileOutcome = {
  status: 'processed' | 'ignored' | 'rejected'
  orderId?: string | null
  paymentIntentId?: string | null
  note?: string
}

export class PaymentAssociationError extends Error {
  readonly reason: string
  constructor(reason: string) {
    super('Payment does not match an NYC order: ' + reason)
    this.name = 'PaymentAssociationError'
    this.reason = reason
  }
}

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}

export async function alertOwner(subject: string, lines: string[]): Promise<void> {
  try {
    await sendEmail({
      to: ownerNotificationRecipients(),
      subject: '[NYC payments] ' + subject,
      html: lines.map(line => '<p>' + line.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)) + '</p>').join(''),
    })
  } catch (error) {
    console.error('[nyc-payments] Owner alert email failed:', error)
  }
}

/** Loads the order a PaymentIntent claims to belong to and checks every association field. */
export async function loadOrderForIntent(intent: Stripe.PaymentIntent) {
  const locationCheck = checkNycPaymentMetadata(intent.metadata, null)
  if (!locationCheck.ok) throw new PaymentAssociationError(locationCheck.reason)
  const order = await prisma.order.findUnique({ where: { id: locationCheck.orderId } })
  if (!order) throw new PaymentAssociationError('order_not_found')
  const check = checkNycPaymentMetadata(intent.metadata, order)
  if (!check.ok) throw new PaymentAssociationError(check.reason)
  if (!livemodeMatches(intent.livemode, nycStripeMode())) throw new PaymentAssociationError('livemode_mismatch')
  if (intent.currency !== 'usd') throw new PaymentAssociationError('currency_not_usd')
  return { order, check }
}

/**
 * Records a succeeded PaymentIntent on its NYC order (idempotent: a PaymentIntent is
 * recorded at most once thanks to the unique Payment.stripePaymentId + row lock).
 */
export async function recordSucceededIntent(intent: Stripe.PaymentIntent, options: { sendReceipt?: boolean; notes?: string; recordedByName?: string | null } = {}) {
  if (intent.status !== 'succeeded') throw new PaymentAssociationError('intent_not_succeeded')
  if (!Number.isSafeInteger(intent.amount_received) || intent.amount_received <= 0) throw new PaymentAssociationError('amount_unverified')
  const { order, check } = await loadOrderForIntent(intent)
  if (!check.ok) throw new PaymentAssociationError('metadata_invalid')
  const saved = intent.setup_future_usage === 'off_session'
  const principal = check.principalCents === null ? 0 : check.principalCents / 100
  const updated = await finalizePayment({
    orderId: order.id,
    amount: intent.amount_received / 100,
    tipAmount: check.tipCents / 100,
    stripePaymentId: intent.id,
    method: 'card',
    allowOverpayment: true,
    increaseTotalBy: check.kind === 'saved_card' ? principal : 0,
    sendReceipt: options.sendReceipt !== false,
    ...(options.notes ? { notes: options.notes } : {}),
    ...(options.recordedByName ? { recordedByName: options.recordedByName } : {}),
    ...(saved ? { savedPaymentMethodId: idOf(intent.payment_method), stripeCustomerId: idOf(intent.customer) || order.stripeCustomerId, autopayEnabled: true } : {}),
  })

  // A save-card checkbox is explicit customer authorization. Persist the current
  // authorization only from server-generated Stripe metadata, and do it even when
  // the payment row already existed (webhook/callback replay recovery).
  if (saved && intent.metadata?.consentVersion === PAYMENT_CARD_AUTHORIZATION_VERSION) {
    const consentAt = new Date(intent.metadata.consentAt || '')
    if (Number.isFinite(consentAt.getTime())) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          savedPaymentMethodId: idOf(intent.payment_method),
          stripeCustomerId: idOf(intent.customer) || order.stripeCustomerId,
          cardOnFileConsentAt: consentAt,
          cardOnFileConsentVersion: PAYMENT_CARD_AUTHORIZATION_VERSION,
          cardOnFileConsentIp: (intent.metadata.consentIp || 'unknown').slice(0, 120),
        },
      })
    }
  }
  return updated
}

/** Records a "processing" placeholder so staff can see a pending payment (no balance change). */
export async function recordProcessingIntent(intent: Stripe.PaymentIntent) {
  const { order } = await loadOrderForIntent(intent)
  const pendingId = intent.id + '_pending'
  const alreadyRecorded = await prisma.payment.findUnique({ where: { stripePaymentId: intent.id } })
  if (alreadyRecorded) return order
  const existing = await prisma.payment.findUnique({ where: { stripePaymentId: pendingId } })
  if (!existing) {
    await prisma.payment.create({
      data: { orderId: order.id, amount: 0, pendingAmount: intent.amount / 100, method: 'card', stripePaymentId: pendingId, status: 'pending', notes: 'Payment processing (pending) via Stripe' },
    }).catch(error => {
      if ((error as { code?: string })?.code !== 'P2002') throw error
    })
  }
  return order
}

export async function recordFailedIntent(intent: Stripe.PaymentIntent, eventId: string) {
  const { order } = await loadOrderForIntent(intent)
  const failedId = intent.id + '_failed_' + eventId
  await prisma.payment.updateMany({ where: { orderId: order.id, stripePaymentId: intent.id + '_pending', status: 'pending' }, data: { status: 'failed' } })
  const existing = await prisma.payment.findUnique({ where: { stripePaymentId: failedId } })
  if (!existing) {
    const message = intent.last_payment_error?.message ? ': ' + intent.last_payment_error.message.slice(0, 300) : ''
    await prisma.payment.create({
      data: { orderId: order.id, amount: 0, pendingAmount: intent.amount / 100, method: 'card', stripePaymentId: failedId, status: 'failed', notes: 'Payment failed via Stripe' + message },
    }).catch(error => {
      if ((error as { code?: string })?.code !== 'P2002') throw error
    })
  }
  return order
}

export async function recordCanceledIntent(intent: Stripe.PaymentIntent) {
  const { order } = await loadOrderForIntent(intent)
  await prisma.payment.updateMany({ where: { orderId: order.id, stripePaymentId: intent.id + '_pending', status: 'pending' }, data: { status: 'canceled' } })
  return order
}

const ACTIVE_REFUND_STATUSES = new Set(['succeeded', 'pending', 'requires_action'])

/**
 * Brings the order's refund rows and amountPaid in line with Stripe for one
 * PaymentIntent. Handles refunds created in the admin, in the Stripe Dashboard,
 * and refunds that later fail or are canceled. Idempotent (keyed by refund id).
 */
export async function reconcileNycRefunds(stripe: Stripe, paymentIntentId: string) {
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId)
  const { order } = await loadOrderForIntent(intent)
  const refunds: Stripe.Refund[] = []
  for await (const refund of stripe.refunds.list({ payment_intent: paymentIntentId, limit: 100 })) refunds.push(refund)

  let changed = 0
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${order.id} FOR UPDATE`
    const current = await tx.order.findUnique({ where: { id: order.id } })
    if (!current) throw new PaymentAssociationError('order_not_found')
    let amountPaidCents = Math.round(Number(current.amountPaid || 0) * 100)
    for (const refund of refunds) {
      if (refund.currency !== 'usd' || !Number.isSafeInteger(refund.amount) || refund.amount <= 0) continue
      const refundStatus = refund.status || 'pending'
      const active = ACTIVE_REFUND_STATUSES.has(refundStatus)
      const rowStatus = refundStatus === 'succeeded' ? 'succeeded' : active ? 'pending' : 'failed'
      const existing = await tx.payment.findUnique({ where: { stripePaymentId: refund.id } })
      if (existing && existing.orderId !== order.id) throw new PaymentAssociationError('refund_belongs_to_other_order')
      if (!existing) {
        if (!active) continue
        await tx.payment.create({
          data: {
            orderId: order.id,
            amount: -(refund.amount / 100),
            method: 'refund',
            stripePaymentId: refund.id,
            status: rowStatus,
            notes: 'Refund of Stripe payment ' + paymentIntentId + (refund.metadata?.requestedBy ? ' (requested by ' + String(refund.metadata.requestedBy).slice(0, 80) + ')' : ' (reconciled from Stripe)'),
          },
        })
        amountPaidCents -= refund.amount
        changed++
        continue
      }
      const wasActive = existing.status !== 'failed'
      if (wasActive && !active) {
        await tx.payment.update({ where: { id: existing.id }, data: { status: 'failed', notes: (existing.notes || '') + ' | Refund ' + refundStatus + ' in Stripe; amount restored to the order.' } })
        amountPaidCents += refund.amount
        changed++
      } else if (existing.status !== rowStatus && active) {
        await tx.payment.update({ where: { id: existing.id }, data: { status: rowStatus } })
        changed++
      }
    }
    if (changed) {
      const amountPaid = Math.max(amountPaidCents, 0) / 100
      await tx.order.update({
        where: { id: order.id },
        data: { amountPaid, balanceDue: Math.max(Math.round((Number(current.totalAmount || 0) - amountPaid) * 100) / 100, 0) },
      })
    }
  })
  return { orderId: order.id, refunds: refunds.length, changed }
}
