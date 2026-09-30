export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { describeStripeError, isNycPaymentsUnavailable, requireNycStripe } from '@/lib/stripe'
import { NYC_PAYMENTS_UNAVAILABLE_MESSAGE } from '@/lib/nycStripeGuard'
import { buildNycPaymentMetadata, checkNycPaymentMetadata, dollarsToCents, nycIdempotencyKey } from '@/lib/nycPaymentMetadata'
import { NYC_SERVER_PRICED_VERSIONS, toCents } from '@/lib/nycCheckoutPricing'
import { aggregateQuantities } from '@/lib/nycCheckoutPricingServer'
import { recordSucceededIntent } from '@/lib/nycStripeReconcile'
import { prisma } from '@/lib/prisma'
import { exactSlotConflict, findInventoryShortfalls, lockNycCapacity, rentalPeriod, shortfallMessage } from '@/lib/nycInventory'
import { evaluateRentalRestrictions } from '@/lib/rentalRestrictions'
import { DeliveryQuoteError, getDeliveryQuote, requireDeliveryMethod, requireMatchingDeliveryFee } from '@/lib/delivery'

// Creates (or safely reuses) the Stripe PaymentIntent for an NYC order.
// Amounts are validated against the order record on the server; the browser only
// chooses how much of the server-computed balance to pay today plus an optional tip.

const STRIPE_MINIMUM_CHARGE_CENTS = 50
const REUSABLE_STATUSES = new Set(['requires_payment_method', 'requires_confirmation', 'requires_action'])

function isStripeMissingResource(error: unknown): boolean {
  return (error as { code?: string })?.code === 'resource_missing'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const orderId = typeof body?.orderId === 'string' ? body.orderId : ''
    const amountCents = dollarsToCents(body?.amount)
    const tipCents = body?.tipAmount === undefined || body?.tipAmount === null || body?.tipAmount === '' ? 0 : dollarsToCents(body.tipAmount)
    const saveCard = body?.saveCard === true

    if (!orderId || !Number.isSafeInteger(amountCents) || amountCents <= 0) {
      return NextResponse.json({ error: 'orderId and a valid amount are required' }, { status: 400 })
    }
    if (!Number.isSafeInteger(tipCents) || tipCents < 0 || tipCents > amountCents) {
      return NextResponse.json({ error: 'Invalid tip amount' }, { status: 400 })
    }
    if (amountCents < STRIPE_MINIMUM_CHARGE_CENTS) {
      return NextResponse.json({ error: 'The minimum online payment is $0.50' }, { status: 400 })
    }

    // Fail closed before any database or Stripe write: go-live switch, full NYC
    // configuration, and proof that the secret key belongs to NYC_STRIPE_ACCOUNT_ID.
    const stripe = await requireNycStripe('charge')

    let order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, customer: true } })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (order.status === 'canceled' || order.status === 'cancelled') {
      return NextResponse.json({ error: 'This order has been canceled. Please contact us.' }, { status: 409 })
    }
    if (order.source === 'online' && !NYC_SERVER_PRICED_VERSIONS.includes(order.pricingVersion || '')) {
      // Totals on this online order were not computed by the server pricing engine.
      return NextResponse.json({ error: 'We need to confirm your total before payment. Please restart checkout or contact us.' }, { status: 409 })
    }

    // First online payment (saved checkout or a pay link for an unpaid order): the
    // stock hold of an unpaid order expires, so re-check everything that could have
    // changed since it was priced before any card can be charged.
    const firstOnlinePayment = order.source === 'online' && Number(order.amountPaid || 0) <= 0 && ['incomplete', 'quote'].includes(order.status)
    if (firstOnlinePayment) {
      requireDeliveryMethod(order.deliveryType)
      if (order.status === 'incomplete' && order.checkoutStage === 'details_completed') {
        return NextResponse.json({ error: 'This saved checkout still needs final pricing. Please return to checkout to continue.' }, { status: 409 })
      }
      if (order.eventDate.getTime() - Date.now() < 24 * 60 * 60 * 1000) {
        return NextResponse.json({ error: 'Orders cannot be paid online within 24 hours of the event date. Please call our office.' }, { status: 409 })
      }
      const restriction = await evaluateRentalRestrictions({
        customerId: order.customerId,
        emails: [order.customer?.email || ''],
        phones: [order.customer?.phone || ''],
        address: order.eventAddress ? { street1: order.eventAddress, city: order.eventCity, state: order.eventState, zip: order.eventZip } : null,
      })
      if (restriction.matched) {
        return NextResponse.json({ error: 'We are unable to complete this reservation online. Please contact our NYC team.' }, { status: 403 })
      }
      const deliveryQuote = await getDeliveryQuote(order.eventZip)
      requireMatchingDeliveryFee(order.deliveryFee, deliveryQuote)
      // Catalog prices must still match what the customer was quoted.
      const lineIds = Array.from(new Set(order.items.map(line => line.itemId).filter((id): id is string => !!id)))
      const catalog = await prisma.item.findMany({ where: { id: { in: lineIds } }, select: { id: true, cost: true } })
      const catalogCents = new Map(catalog.map(item => [item.id, toCents(Number(item.cost))]))
      if (order.items.some(line => !line.itemId || catalogCents.get(line.itemId) !== toCents(Number(line.unitPrice)))) {
        return NextResponse.json({ error: 'Prices in this saved checkout have changed. Please restart checkout to see the current total before paying.' }, { status: 409 })
      }
      const exactSettings = (order.exactDeliveryRequested && order.exactDeliveryTime) || (order.pickupType === 'exact' && order.exactPickupTime)
        ? await prisma.exactTimeSettings.findFirst()
        : null
      if (exactSettings?.enabled === false) return NextResponse.json({ error: 'Exact-time scheduling is currently unavailable. Please contact our office.' }, { status: 409 })
      const quantities = aggregateQuantities(order.items.map(line => ({ id: line.itemId || '', quantity: line.quantity })))
      const period = rentalPeriod(order.eventDate, order.rentalDays, order.eventEndDate)
      const current = order
      const held = await prisma.$transaction(async tx => {
        await lockNycCapacity(tx)
        const shortfalls = await findInventoryShortfalls(tx, quantities, period, current.id)
        if (shortfalls.length) return { ok: false as const, error: shortfallMessage(shortfalls[0]) }
        const conflict = await exactSlotConflict(tx, {
          eventDate: current.eventDate,
          deliveryTime: current.exactDeliveryRequested ? current.exactDeliveryTime : null,
          pickupTime: current.pickupType === 'exact' ? current.exactPickupTime : null,
          defaultCapacity: exactSettings?.defaultCapacityPerSlot ?? 1,
          excludeOrderId: current.id,
        })
        if (conflict) return { ok: false as const, error: 'The exact ' + conflict + ' time on this order is no longer available. Please contact our office.' }
        // Refresh the hold: an unpaid online order holds stock while payment is in progress.
        await tx.order.update({ where: { id: current.id }, data: { status: 'quote', checkoutStage: 'payment_started', checkoutLastSeenAt: new Date() } })
        return { ok: true as const }
      }, { maxWait: 10000, timeout: 20000 })
      if (!held.ok) return NextResponse.json({ error: held.error }, { status: 409 })
      order = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true, customer: true } })
    }

    // SECURITY: the amount owed comes from the order record, never from the browser.
    const principalCents = amountCents - tipCents
    const totalCents = toCents(Number(order.totalAmount || 0))
    const paidCents = toCents(Number(order.amountPaid || 0))
    const remainingCents = Math.max(totalCents - paidCents, 0)

    if (remainingCents <= 0 && tipCents <= 0) {
      return NextResponse.json({ error: 'This order has already been paid in full' }, { status: 400 })
    }
    if (principalCents > remainingCents) {
      return NextResponse.json({ error: 'Amount exceeds the remaining balance of $' + (remainingCents / 100).toFixed(2) }, { status: 400 })
    }
    const depositCents = toCents(Number(order.depositAmount || 0))
    const minimumCents = remainingCents <= 0
      ? 0
      : paidCents === 0 && depositCents > 0
        ? Math.min(depositCents, remainingCents)
        : Math.min(STRIPE_MINIMUM_CHARGE_CENTS, remainingCents)
    if (principalCents < minimumCents) {
      return NextResponse.json({ error: 'Minimum payment required is $' + (minimumCents / 100).toFixed(2) }, { status: 400 })
    }
    if (tipCents > Math.max(totalCents, 0)) {
      return NextResponse.json({ error: 'Please contact us to add a tip larger than the order total.' }, { status: 400 })
    }

    const metadata = buildNycPaymentMetadata({
      orderId: order.id,
      orderNumber: order.orderNumber,
      kind: paidCents === 0 ? 'checkout' : 'balance',
      principalCents,
      tipCents,
    })

    // Duplicate submission / retry protection: reuse the open PaymentIntent for the
    // same order and amount; cancel an open one for a different amount before
    // creating a replacement, so two live intents can never both be paid.
    if (order.stripePaymentId && order.stripePaymentId.startsWith('pi_')) {
      let previous: Stripe.PaymentIntent | null = null
      try {
        previous = await stripe.paymentIntents.retrieve(order.stripePaymentId)
      } catch (error) {
        if (!isStripeMissingResource(error)) throw error
      }
      if (previous) {
        const previousCheck = checkNycPaymentMetadata(previous.metadata, order)
        if (previous.status === 'succeeded' || previous.status === 'processing') {
          const recorded = await prisma.payment.findUnique({ where: { stripePaymentId: previous.id } })
          if (!recorded) {
            // Money was already captured (or is in flight) for this order but not yet
            // recorded. Record a verified success now and stop, so the customer is
            // never charged twice for the same balance.
            if (previous.status === 'succeeded' && previousCheck.ok) {
              try { await recordSucceededIntent(previous, { sendReceipt: true }) } catch (error) { console.error('[checkout] Could not record earlier payment', previous.id, error) }
            }
            return NextResponse.json({ error: 'We found an earlier payment for this order that is still being confirmed. Please refresh to see your updated balance before paying again.' }, { status: 409 })
          }
        } else if (REUSABLE_STATUSES.has(previous.status)) {
          const sameRequest = previousCheck.ok
            && previous.amount === amountCents
            && previous.currency === 'usd'
            && previousCheck.tipCents === tipCents
            && previousCheck.principalCents === principalCents
            && (previous.setup_future_usage === 'off_session') === saveCard
          if (sameRequest && previous.client_secret) {
            return NextResponse.json({ clientSecret: previous.client_secret, paymentIntentId: previous.id, reused: true })
          }
          await stripe.paymentIntents.cancel(previous.id, undefined, { idempotencyKey: nycIdempotencyKey(['cancel', previous.id]) })
        }
      }
    }

    let stripeCustomerId = order.stripeCustomerId || undefined
    if (saveCard && !stripeCustomerId) {
      const customer = await stripe.customers.create({
        metadata: buildNycPaymentMetadata({ orderId: order.id, orderNumber: order.orderNumber, kind: 'checkout', principalCents: 0, tipCents: 0 }),
      }, { idempotencyKey: nycIdempotencyKey(['customer', order.id]) })
      stripeCustomerId = customer.id
      await prisma.order.update({ where: { id: order.id }, data: { stripeCustomerId } })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      description: 'Friendly Party Rental NYC order ' + order.orderNumber,
      ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
      ...(saveCard ? { setup_future_usage: 'off_session' as const } : {}),
      metadata,
    }, {
      idempotencyKey: nycIdempotencyKey(['pi', order.id, amountCents, tipCents, saveCard ? 1 : 0, stripeCustomerId || 'guest', order.stripePaymentId || 'first']),
    })

    await prisma.order.update({
      where: { id: order.id },
      data: { stripePaymentId: paymentIntent.id, checkoutStage: 'payment_started', checkoutLastSeenAt: new Date() },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error) {
    if (isNycPaymentsUnavailable(error)) {
      console.error('[checkout] Payment blocked:', error.reason)
      return NextResponse.json({ error: NYC_PAYMENTS_UNAVAILABLE_MESSAGE, code: 'payments_unavailable' }, { status: 503 })
    }
    if (error instanceof DeliveryQuoteError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[checkout] Could not start payment:', describeStripeError(error))
    return NextResponse.json({ error: 'Payment could not be started. Please try again or contact us.' }, { status: 502 })
  }
}
