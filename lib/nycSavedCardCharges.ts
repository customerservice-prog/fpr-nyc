import type Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { buildNycPaymentMetadata, dollarsToCents, nycIdempotencyKey } from '@/lib/nycPaymentMetadata'
import { recordSucceededIntent } from '@/lib/nycStripeReconcile'
import { requireNycStripe } from '@/lib/stripe'

export class NycSavedCardChargeError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
    this.name = 'NycSavedCardChargeError'
  }
}

export type NycSavedCardChargeInput = {
  orderId: string
  requestKey: string
  amount: number
  reason: string
  addToOrderTotal: boolean
  type: string
  createdByName: string
}

const ACTIVE_STATUSES = ['pending', 'processing', 'reconciliation_required']

export async function reserveNycSavedCardCharge(input: NycSavedCardChargeInput) {
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(input.requestKey)) {
    throw new NycSavedCardChargeError('A valid request key is required. Refresh the order page.')
  }
  const amountCents = dollarsToCents(input.amount)
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > 99999999) {
    throw new NycSavedCardChargeError('Enter a valid amount.')
  }
  if (!input.reason.trim()) throw new NycSavedCardChargeError('A documented reason is required.')

  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${input.orderId} FOR UPDATE`
    const order = await tx.order.findUnique({ where: { id: input.orderId } })
    if (!order) throw new NycSavedCardChargeError('Order not found.', 404)

    const existing = await tx.orderAdditionalCharge.findUnique({ where: { requestKey: input.requestKey } })
    if (existing) {
      if (
        existing.orderId !== input.orderId ||
        Math.round(existing.amount * 100) !== amountCents ||
        existing.reason !== input.reason ||
        existing.type !== input.type ||
        existing.addsToOrderTotal !== input.addToOrderTotal
      ) {
        throw new NycSavedCardChargeError('This request key belongs to a different charge.', 409)
      }
      return { order, charge: existing }
    }

    if (!order.stripeCustomerId || !order.savedPaymentMethodId) {
      throw new NycSavedCardChargeError('No card is saved for this order.')
    }
    if (['canceled', 'cancelled'].includes(order.status)) {
      throw new NycSavedCardChargeError('This order is canceled. Review it before collecting payment.')
    }
    if (input.addToOrderTotal && (!order.cardOnFileConsentAt || !order.cardOnFileConsentVersion)) {
      throw new NycSavedCardChargeError('Have the customer complete card authorization before adding a post-rental charge.')
    }

    const pending = await tx.orderAdditionalCharge.findFirst({
      where: { orderId: order.id, status: { in: ACTIVE_STATUSES } },
    })
    if (pending) {
      throw new NycSavedCardChargeError('Another card charge is pending or needs reconciliation. Review it before starting another charge.', 409)
    }

    if (input.addToOrderTotal) {
      const duplicate = await tx.orderAdditionalCharge.findFirst({
        where: {
          orderId: order.id,
          addsToOrderTotal: true,
          amount: input.amount,
          reason: input.reason,
          type: input.type,
        },
      })
      if (duplicate) throw new NycSavedCardChargeError('This fee is already on the order. Collect the existing balance instead of adding it again.', 409)
    }

    const currentBalance = Math.max(Math.round((order.totalAmount - order.amountPaid) * 100) / 100, 0)
    if (!input.addToOrderTotal && input.amount > currentBalance + 0.001) {
      throw new NycSavedCardChargeError('Charge cannot exceed the balance due of $' + currentBalance.toFixed(2) + '.')
    }

    const charge = await tx.orderAdditionalCharge.create({
      data: {
        orderId: order.id,
        requestKey: input.requestKey,
        type: input.type,
        amount: input.amount,
        reason: input.reason,
        addsToOrderTotal: input.addToOrderTotal,
        status: 'pending',
        createdByName: input.createdByName,
        consentVersion: order.cardOnFileConsentVersion,
        consentAt: order.cardOnFileConsentAt,
      },
    })

    if (input.addToOrderTotal) {
      await tx.order.update({
        where: { id: order.id },
        data: {
          miscellaneousFees: { increment: input.amount },
          totalAmount: { increment: input.amount },
          balanceDue: currentBalance + input.amount,
        },
      })
    }

    return { order, charge }
  }, { timeout: 15000 })
}

export async function collectNycSavedCardCharge(input: NycSavedCardChargeInput) {
  // The actual Stripe writer owns the account guard so callers cannot bypass it.
  const stripe: Stripe = await requireNycStripe('charge')
  const { order, charge } = await reserveNycSavedCardCharge(input)

  if (charge.status === 'succeeded') {
    return { success: true, status: 'succeeded', chargeId: charge.id, stripePaymentIntentId: charge.stripePaymentIntentId }
  }
  if (charge.status === 'failed' || charge.status === 'requires_action') {
    return { success: false, status: charge.status, chargeId: charge.id, error: charge.failureMessage || 'This attempt failed. The fee remains on the order; collect the existing balance instead of adding it again.' }
  }
  if (!charge.stripePaymentIntentId && Date.now() - charge.createdAt.getTime() > 23 * 60 * 60 * 1000) {
    throw new NycSavedCardChargeError('This attempt needs Stripe reconciliation before it can be retried.', 409)
  }

  let intent: Stripe.PaymentIntent | undefined
  try {
    if (charge.stripePaymentIntentId) {
      intent = await stripe.paymentIntents.retrieve(charge.stripePaymentIntentId)
    } else {
      const amountCents = dollarsToCents(charge.amount)
      intent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'usd',
        customer: order.stripeCustomerId!,
        payment_method: order.savedPaymentMethodId!,
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
        description: 'Friendly Party Rental NYC order ' + order.orderNumber + ' - ' + charge.type.replace(/_/g, ' '),
        metadata: buildNycPaymentMetadata({
          orderId: order.id,
          orderNumber: order.orderNumber,
          kind: 'saved_card',
          principalCents: amountCents,
          tipCents: 0,
          extra: {
            chargeRecordId: charge.id,
            chargeType: charge.type,
          },
        }),
      }, { idempotencyKey: nycIdempotencyKey(['saved-card-create', charge.id]) })
      await prisma.orderAdditionalCharge.update({
        where: { id: charge.id },
        data: { stripePaymentIntentId: intent.id },
      })
    }

    if (intent.status === 'requires_confirmation' || (intent.status === 'requires_payment_method' && !intent.last_payment_error)) {
      intent = await stripe.paymentIntents.confirm(
        intent.id,
        { off_session: true },
        { idempotencyKey: nycIdempotencyKey(['saved-card-confirm', charge.id]) },
      )
    }

    if (intent.status === 'succeeded') {
      await recordSucceededIntent(intent, { recordedByName: charge.createdByName || undefined })
      return { success: true, status: 'succeeded', chargeId: charge.id, stripePaymentIntentId: intent.id }
    }

    if (intent.status === 'requires_action' || intent.status === 'requires_payment_method' || intent.status === 'canceled') {
      if (intent.status !== 'canceled') {
        await stripe.paymentIntents.cancel(intent.id, undefined, { idempotencyKey: nycIdempotencyKey(['saved-card-cancel', charge.id]) })
      }
      const message = 'The card could not complete this payment. The fee remains on the order. Use the payment link to collect the existing balance.'
      await prisma.orderAdditionalCharge.updateMany({
        where: { id: charge.id, status: { not: 'succeeded' } },
        data: { status: 'failed', failureMessage: message, stripePaymentIntentId: intent.id },
      })
      return { success: false, status: 'failed', chargeId: charge.id, error: message }
    }

    await prisma.orderAdditionalCharge.updateMany({
      where: { id: charge.id, status: { not: 'succeeded' } },
      data: { status: 'processing', stripePaymentIntentId: intent.id },
    })
    return { success: false, status: 'processing', chargeId: charge.id, message: 'Stripe is processing this payment. Do not add the fee again.' }
  } catch (error: any) {
    const failedIntent = error?.payment_intent as Stripe.PaymentIntent | undefined
    if (failedIntent && ['requires_action', 'requires_payment_method', 'canceled'].includes(failedIntent.status)) {
      if (failedIntent.status !== 'canceled') {
        await stripe.paymentIntents.cancel(failedIntent.id, undefined, { idempotencyKey: nycIdempotencyKey(['saved-card-cancel', charge.id]) })
      }
      const message = 'Card declined or customer authentication required. The fee is already on the order; use the payment link to collect the existing balance.'
      await prisma.orderAdditionalCharge.updateMany({
        where: { id: charge.id, status: { not: 'succeeded' } },
        data: { status: 'failed', stripePaymentIntentId: failedIntent.id, failureMessage: message },
      })
      return { success: false, status: 'failed', chargeId: charge.id, error: message }
    }

    await prisma.orderAdditionalCharge.updateMany({
      where: { id: charge.id, status: { not: 'succeeded' } },
      data: {
        status: intent?.status === 'succeeded' ? 'reconciliation_required' : 'processing',
        failureMessage: 'Payment result needs verification. Retry this same attempt; do not create another charge.',
      },
    })
    throw new NycSavedCardChargeError('Payment result needs verification. Retry this same attempt; do not create another charge.', 409)
  }
}
