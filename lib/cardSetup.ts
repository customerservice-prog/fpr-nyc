import { createHash, timingSafeEqual } from 'node:crypto'
import type Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { CARD_AUTHORIZATION_VERSION } from '@/lib/cardAuthorization'
import { NYC_LOCATION, NYC_PAYMENT_APP } from '@/lib/nycPaymentMetadata'

export function hashCardSetupToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function validCardSetupToken(
  order: { cardSetupTokenHash: string | null; cardSetupTokenExpiresAt: Date | null },
  token: string,
) {
  if (!/^[a-f0-9]{64}$/.test(token) || !order.cardSetupTokenHash || !order.cardSetupTokenExpiresAt || order.cardSetupTokenExpiresAt.getTime() <= Date.now()) return false
  const entered = Buffer.from(hashCardSetupToken(token), 'hex')
  const stored = Buffer.from(order.cardSetupTokenHash, 'hex')
  return entered.length === stored.length && timingSafeEqual(entered, stored)
}

/**
 * Completes an NYC SetupIntent without recording a payment. The SetupIntent must
 * have been created by the NYC app, for the current token, on the same Stripe customer.
 * Replaced/expired authorization links cannot overwrite a newer payment method.
 */
export async function completeNycCardSetup(intent: Stripe.SetupIntent) {
  if (
    intent.status !== 'succeeded' ||
    intent.usage !== 'off_session' ||
    intent.metadata?.location !== NYC_LOCATION ||
    intent.metadata?.app !== NYC_PAYMENT_APP ||
    intent.metadata?.consentVersion !== CARD_AUTHORIZATION_VERSION
  ) {
    throw new Error('Card setup is not complete or does not belong to NYC')
  }

  const customer = typeof intent.customer === 'string' ? intent.customer : intent.customer?.id
  const method = typeof intent.payment_method === 'string' ? intent.payment_method : intent.payment_method?.id
  const orderId = intent.metadata?.orderId
  const tokenHash = intent.metadata?.tokenHash
  if (!customer || !method || !orderId || !tokenHash) throw new Error('Invalid card setup')

  const consentAt = new Date(intent.metadata.consentAt || '')
  if (!Number.isFinite(consentAt.getTime())) throw new Error('Invalid authorization timestamp')

  const result = await prisma.order.updateMany({
    where: {
      id: orderId,
      stripeCustomerId: customer,
      cardSetupTokenHash: tokenHash,
    },
    data: {
      savedPaymentMethodId: method,
      cardOnFileConsentAt: consentAt,
      cardOnFileConsentVersion: CARD_AUTHORIZATION_VERSION,
      cardOnFileConsentIp: (intent.metadata.consentIp || 'unknown').slice(0, 120),
    },
  })
  if (!result.count) throw new Error('This authorization link was replaced. Request a new link.')

  return { orderId, paymentMethodId: method }
}
