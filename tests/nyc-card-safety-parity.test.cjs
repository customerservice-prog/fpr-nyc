const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')

const read = file => fs.readFileSync(file, 'utf8')

test('NYC saved-card authorization has durable consent and charge-ledger schema', () => {
  const schema = read('prisma/schema.prisma')
  for (const field of [
    'cardSetupTokenHash String?',
    'cardSetupTokenExpiresAt DateTime?',
    'cardOnFileConsentAt DateTime?',
    'cardOnFileConsentIp String?',
    'cardOnFileConsentVersion String?',
    'additionalCharges OrderAdditionalCharge[]',
  ]) assert.ok(schema.includes(field), 'missing Order field: ' + field)
  assert.match(schema, /model OrderAdditionalCharge \{/)
  assert.match(schema, /stripePaymentIntentId String\? @unique/)
  assert.match(schema, /requestKey String\? @unique/)
  assert.match(schema, /addsToOrderTotal Boolean @default\(false\)/)
})

test('NYC authorization link never takes a payment and uses the guarded NYC Stripe account', () => {
  const admin = read('app/api/admin/orders/[id]/card-setup-link/route.ts')
  const publicApi = read('app/api/orders/[id]/card-setup/route.ts')
  const page = read('app/(public)/save-card/[id]/page.tsx')
  assert.match(admin, /randomBytes\(32\)/)
  assert.match(admin, /cardSetupTokenHash/)
  assert.match(publicApi, /requireNycStripe\('charge'\)/)
  assert.match(publicApi, /requireNycStripe\('reconcile'\)/)
  assert.match(publicApi, /setupIntents\.create/)
  assert.match(publicApi, /location: NYC_LOCATION/)
  assert.match(publicApi, /app: NYC_PAYMENT_APP/)
  assert.ok(!publicApi.includes('paymentIntents.create'), 'authorization setup must not take money')
  assert.match(page, /No payment was taken today/)
  assert.match(page, /Stripe/)
})

test('normal NYC payment save-card consent is persisted from server-generated Stripe metadata', () => {
  const checkout = read('app/api/checkout/route.ts')
  const reconcile = read('lib/nycStripeReconcile.ts')
  assert.match(checkout, /PAYMENT_CARD_AUTHORIZATION_VERSION/)
  assert.match(checkout, /consentAt: new Date\(\)\.toISOString\(\)/)
  assert.match(checkout, /consentIp: requestIp\(request\)/)
  assert.match(reconcile, /cardOnFileConsentAt/)
  assert.match(reconcile, /cardOnFileConsentVersion/)
  assert.match(reconcile, /cardOnFileConsentIp/)
})

test('NYC SetupIntent webhook recovery is enabled', () => {
  const ledger = read('lib/nycWebhookLedger.ts')
  const webhook = read('lib/nycStripeWebhook.ts')
  assert.match(ledger, /setup_intent\.succeeded/)
  assert.match(webhook, /handleSetupIntentEvent/)
  assert.match(webhook, /completeNycCardSetup/)
  assert.match(webhook, /setupIntents\.retrieve/)
})

test('saved-card charges use a database request ledger before Stripe', () => {
  const helper = read('lib/nycSavedCardCharges.ts')
  const route = read('app/api/admin/orders/[id]/charge-saved-card/route.ts')
  assert.match(helper, /orderAdditionalCharge\.findUnique/)
  assert.match(helper, /orderAdditionalCharge\.create/)
  assert.match(helper, /requestKey/)
  assert.match(helper, /Another card charge is pending/)
  assert.match(helper, /Have the customer complete card authorization/)
  assert.match(helper, /nycIdempotencyKey/)
  assert.match(helper, /buildNycPaymentMetadata/)
  assert.match(route, /requireNycStripe\('charge'\)/)
  assert.match(route, /collectNycSavedCardCharge/)
  assert.ok(!route.includes('paymentIntents.create'), 'route must delegate to the replay-safe ledger')
})

test('NYC order UI exposes authorization, balance collection, new-fee consent gate and attempt history', () => {
  const page = read('app/admin/orders/[id]/page.tsx')
  assert.match(page, /CardSetupLink/)
  assert.match(page, /Existing unpaid balance/)
  assert.match(page, /New documented fee/)
  assert.match(page, /Customer authorization is required before charging a new fee/)
  assert.match(page, /nyc-saved-card-attempt-/)
  assert.match(page, /Saved-card charge attempts/)
})
