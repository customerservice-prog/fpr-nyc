export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { describeStripeError, isNycPaymentsUnavailable, requireNycStripe } from '@/lib/stripe'
import { validCardSetupToken, hashCardSetupToken, completeNycCardSetup } from '@/lib/cardSetup'
import { CARD_AUTHORIZATION_TEXT, CARD_AUTHORIZATION_VERSION } from '@/lib/cardAuthorization'
import { NYC_LOCATION, NYC_PAYMENT_APP, nycIdempotencyKey } from '@/lib/nycPaymentMetadata'

function clientIp(request: NextRequest) {
  return (request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown').split(',')[0].trim().slice(0, 120)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const token = String(body.token || '')
    const order = await prisma.order.findUnique({ where: { id } })
    if (!order || ['canceled', 'cancelled'].includes(order.status) || !validCardSetupToken(order, token)) {
      return NextResponse.json({ error: 'This link is invalid or expired. Please ask Friendly Party Rental NYC for a new link.' }, { status: 403 })
    }

    if (body.action === 'info') {
      return NextResponse.json(
        { orderNumber: order.orderNumber, authorization: CARD_AUTHORIZATION_TEXT, version: CARD_AUTHORIZATION_VERSION },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }

    if (body.action === 'confirm') {
      if (typeof body.setupIntentId !== 'string' || !body.setupIntentId.startsWith('seti_')) {
        return NextResponse.json({ error: 'Invalid setup' }, { status: 400 })
      }
      const stripe = await requireNycStripe('reconcile')
      const intent = await stripe.setupIntents.retrieve(body.setupIntentId)
      if (
        intent.metadata?.orderId !== id ||
        intent.metadata?.tokenHash !== hashCardSetupToken(token) ||
        intent.metadata?.location !== NYC_LOCATION ||
        intent.metadata?.app !== NYC_PAYMENT_APP
      ) {
        return NextResponse.json({ error: 'Setup does not match this NYC order' }, { status: 400 })
      }
      await completeNycCardSetup(intent)
      return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
    }

    if (body.action !== 'create' || body.consent !== true || body.version !== CARD_AUTHORIZATION_VERSION) {
      return NextResponse.json({ error: 'Please accept the displayed card authorization.' }, { status: 400 })
    }

    const stripe = await requireNycStripe('charge')
    let customer = order.stripeCustomerId
    if (!customer) {
      customer = (await stripe.customers.create({
        metadata: { location: NYC_LOCATION, app: NYC_PAYMENT_APP, orderId: id, orderNumber: order.orderNumber },
      }, { idempotencyKey: nycIdempotencyKey(['card-setup-customer', id]) })).id
      await prisma.order.update({ where: { id }, data: { stripeCustomerId: customer } })
    }

    const tokenHash = hashCardSetupToken(token)
    const consentAt = new Date().toISOString()
    const intent = await stripe.setupIntents.create({
      customer,
      usage: 'off_session',
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      metadata: {
        location: NYC_LOCATION,
        app: NYC_PAYMENT_APP,
        orderId: id,
        orderNumber: order.orderNumber,
        tokenHash,
        consentVersion: CARD_AUTHORIZATION_VERSION,
        consentAt,
        consentIp: clientIp(request),
      },
    }, { idempotencyKey: nycIdempotencyKey(['card-setup', id, tokenHash]) })

    return NextResponse.json(
      { clientSecret: intent.client_secret },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    if (isNycPaymentsUnavailable(error)) {
      return NextResponse.json({ error: 'Card saving is temporarily unavailable. Please contact our NYC team.' }, { status: 503 })
    }
    console.error('[nyc-card-setup]', describeStripeError(error))
    return NextResponse.json({ error: 'Could not complete card setup. Please try again or contact us.' }, { status: 500 })
  }
}
