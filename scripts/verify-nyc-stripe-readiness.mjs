import Stripe from 'stripe'

const expectedAccountId = String(process.env.NYC_STRIPE_ACCOUNT_ID || '').trim()
const secretKey = String(process.env.STRIPE_SECRET_KEY || '').trim()
const publishableKey = String(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '').trim()
const webhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET || '').trim()
const onlineEnabled = String(process.env.NYC_ONLINE_PAYMENTS_ENABLED || '').trim() === 'true'

function fail(message) {
  console.error('[nyc-stripe-verify] ' + message)
  process.exit(1)
}

if (!/^acct_[A-Za-z0-9]+$/.test(expectedAccountId)) fail('NYC_STRIPE_ACCOUNT_ID is missing or invalid')
if (!/^(?:sk|rk)_live_[A-Za-z0-9_]+$/.test(secretKey)) fail('STRIPE_SECRET_KEY must be a live Stripe secret or restricted key')
if (!/^pk_live_[A-Za-z0-9_]+$/.test(publishableKey)) fail('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must be a live publishable key')
if (!/^whsec_[A-Za-z0-9_]+$/.test(webhookSecret)) fail('STRIPE_WEBHOOK_SECRET is missing or invalid')

const stripe = new Stripe(secretKey)

try {
  const account = await stripe.accounts.retrieve()
  if (!account || account.id !== expectedAccountId) {
    fail('Stripe key belongs to ' + (account?.id || 'an unknown account') + ', expected ' + expectedAccountId)
  }
  if (onlineEnabled && account.charges_enabled !== true) fail('Stripe charges are not enabled')
  if (onlineEnabled && account.payouts_enabled !== true) fail('Stripe payouts are not enabled')
  console.log(JSON.stringify({
    verified: true,
    accountId: account.id,
    accountName: account.business_profile?.name || account.settings?.dashboard?.display_name || null,
    chargesEnabled: account.charges_enabled === true,
    payoutsEnabled: account.payouts_enabled === true,
    onlinePaymentsSwitch: onlineEnabled,
    publishableKeyMode: 'live',
    webhookSecretPresent: true,
  }))
} catch (error) {
  fail('Stripe account verification failed: ' + (error instanceof Error ? error.message : String(error)))
}
