// NYC Stripe payment safeguards.
// Static checks run everywhere; behavioral checks transpile the pure TypeScript
// modules with the project's own `typescript` dev dependency (no Next.js, Prisma,
// Stripe, or network access needed).
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

function loadTs(file) {
  const ts = require('typescript')
  const source = read(file)
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: file,
  }).outputText
  const module = { exports: {} }
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', 'require', output)(module, module.exports, require)
  return module.exports
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(rel, out)
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(rel)
  }
  return out
}

// ---------------------------------------------------------------------------
// Static guarantees
// ---------------------------------------------------------------------------

test('Stripe client is only reachable through the NYC account guard', () => {
  const lib = read('lib/stripe.ts')
  assert.doesNotMatch(lib, /export const stripe\b/)
  assert.match(lib, /export async function requireNycStripe/)
  assert.match(lib, /client\.accounts\.retrieve\(\)/)
  assert.match(lib, /assertAccountMatches\(account\?\.id, expectedAccountId\)/)
  const writers = walk('app').concat(walk('lib')).filter(file => {
    const code = read(file)
    return /\.(paymentIntents|refunds|customers)\.(create|cancel|confirm|update)\(/.test(code)
  })
  assert.ok(writers.length >= 4, 'expected payment write call sites')
  for (const file of writers) {
    assert.match(read(file), /requireNycStripe\('(charge|refund)'\)/, file + ' must pass the NYC account guard before writing to Stripe')
  }
  for (const file of walk('app').concat(walk('lib'))) {
    assert.doesNotMatch(read(file), /import \{[^}]*\bstripe\b[^}]*\} from '@\/lib\/stripe'/, file + ' imports a raw Stripe client')
  }
})

test('No simulated payment path remains', () => {
  for (const file of [
    'app/api/checkout/route.ts',
    'app/api/orders/[id]/confirm-payment/route.ts',
    'app/(public)/checkout/payment/page.tsx',
    'app/(public)/pay/[id]/page.tsx',
    'app/admin/orders/[id]/checkout/page.tsx',
    'app/driver/card-reader/page.tsx',
  ]) {
    const code = read(file)
    assert.doesNotMatch(code, /simulated_/, file)
    assert.doesNotMatch(code, /\.simulated\b/, file)
  }
})

test('Every PaymentIntent is created with server metadata and an idempotency key', () => {
  for (const file of ['app/api/checkout/route.ts', 'app/api/admin/orders/[id]/charge-saved-card/route.ts', 'app/api/cron/auto-charge/route.ts']) {
    const code = read(file)
    const create = code.slice(code.indexOf('paymentIntents.create('))
    const metadataInline = /buildNycPaymentMetadata\(/.test(create.slice(0, 1400))
    const metadataVariable = /\n\s+metadata,\n/.test(create.slice(0, 1400)) && /const metadata = buildNycPaymentMetadata\(/.test(code)
    assert.ok(metadataInline || metadataVariable, file + ' must tag the PaymentIntent with server-built NYC metadata')
    const keyInline = /idempotencyKey: nycIdempotencyKey\(/.test(create.slice(0, 1600))
    const keyVariable = /\{ idempotencyKey \}\)/.test(create.slice(0, 1600)) && /const idempotencyKey = nycIdempotencyKey\(/.test(code)
    assert.ok(keyInline || keyVariable, file + ' must send a Stripe idempotency key')
    assert.match(create.slice(0, 600), /payment_method_types: \['card'\]/, file)
  }
  const refund = read('app/api/admin/orders/[id]/refund/route.ts')
  assert.match(refund, /location: NYC_LOCATION/)
  assert.match(refund, /idempotencyKey: nycIdempotencyKey\(\['refund'/)
})

test('Webhook verifies the raw body, is idempotent, and retries on failure', () => {
  const route = read('app/api/webhooks/stripe/route.ts')
  const rawIndex = route.indexOf('await request.text()')
  assert.ok(rawIndex > 0)
  assert.ok(rawIndex < route.indexOf('constructNycWebhookEvent(rawBody, signature)'))
  assert.doesNotMatch(route, /request\.json\(\)/)
  assert.match(route, /claimWebhookEvent\(event\)/)
  assert.match(route, /status: 500/)
  assert.match(route, /failWebhookEvent\(event\.id, error\)/)
  const lib = read('lib/stripe.ts')
  assert.match(lib, /webhooks\.constructEvent\(rawBody, signature, secret, 300\)/)
  const schema = read('prisma/schema.prisma')
  assert.match(schema, /model StripeWebhookEvent \{/)
  assert.ok(fs.existsSync(path.join(root, 'prisma/migrations/20260929200000_nyc_stripe_safeguards/migration.sql')))
})

test('Confirmation never trusts browser amounts or marks unpaid orders paid', () => {
  const route = read('app/api/orders/[id]/confirm-payment/route.ts')
  assert.doesNotMatch(route, /body\??\.amount/)
  assert.doesNotMatch(route, /body\??\.tipAmount/)
  assert.doesNotMatch(route, /body\??\.saveCard/)
  assert.match(route, /paymentIntents\.retrieve\(stripePaymentId\)/)
  assert.match(route, /intent\.status !== 'succeeded'/)
  const reconcile = read('lib/nycStripeReconcile.ts')
  assert.match(reconcile, /checkNycPaymentMetadata\(intent\.metadata, order\)/)
  assert.match(reconcile, /allowOverpayment: true/)
})

test('Checkout totals are recomputed on the server with no guessed tax rate', () => {
  const orders = read('app/api/orders/route.ts')
  assert.match(orders, /const pricing = await priceNycCheckout\(body\)/)
  assert.match(orders, /sameCents\(totalAmountInput, pricing\.grandTotal\)/)
  assert.match(orders, /unitPrice: line\.unitPrice/)
  assert.doesNotMatch(orders, /unitPrice: item\.unitPrice/)
  const draft = read('app/api/checkout/draft/route.ts')
  assert.doesNotMatch(draft, /Number\(body\.totalAmount\)/)
  assert.doesNotMatch(draft, /item\.unitPrice \?\? item\.price/)
  const tax = read('app/api/tax-rate/route.ts')
  assert.doesNotMatch(tax, /rate: 8/)
  const checkout = read('app/api/checkout/route.ts')
  assert.match(checkout, /NYC_SERVER_PRICED_VERSIONS\.includes\(order\.pricingVersion/)
})

test('Environment template documents the NYC account and payments switch', () => {
  const env = read('.env.example')
  assert.match(env, /^NYC_STRIPE_ACCOUNT_ID=$/m)
  assert.match(env, /^NYC_ONLINE_PAYMENTS_ENABLED=false$/m)
})

// ---------------------------------------------------------------------------
// Behavioral tests of the pure modules
// ---------------------------------------------------------------------------

let hasTypescript = true
try { require.resolve('typescript') } catch { hasTypescript = false }
const behavior = hasTypescript ? test : test.skip

const LIVE_SK = 'sk_live_' + 'a'.repeat(40)
const TEST_SK = 'sk_test_' + 'b'.repeat(40)
const LIVE_PK = 'pk_live_' + 'c'.repeat(40)
const TEST_PK = 'pk_test_' + 'd'.repeat(40)
const WHSEC = 'whsec_' + 'e'.repeat(32)
const ACCT = 'acct_1NycTestAccount'

behavior('guard: missing or invalid configuration blocks every payment path', () => {
  const guard = loadTs('lib/nycStripeGuard.ts')
  const empty = guard.inspectNycStripeConfig({})
  assert.deepEqual(empty.serverProblems, ['secret_key_missing', 'account_id_missing'])
  assert.ok(empty.chargeProblems.includes('online_payments_switch_off'))
  const placeholder = guard.inspectNycStripeConfig({ STRIPE_SECRET_KEY: 'sk_live_xxx', NYC_STRIPE_ACCOUNT_ID: 'acct_x' })
  assert.deepEqual(placeholder.serverProblems, ['secret_key_invalid', 'account_id_invalid'])
  const ready = guard.inspectNycStripeConfig({ STRIPE_SECRET_KEY: LIVE_SK, NYC_STRIPE_ACCOUNT_ID: ACCT, STRIPE_WEBHOOK_SECRET: WHSEC, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: LIVE_PK, NYC_ONLINE_PAYMENTS_ENABLED: 'true' })
  assert.equal(ready.mode, 'live')
  assert.deepEqual(ready.chargeProblems, [])
  const switchOff = guard.inspectNycStripeConfig({ STRIPE_SECRET_KEY: LIVE_SK, NYC_STRIPE_ACCOUNT_ID: ACCT, STRIPE_WEBHOOK_SECRET: WHSEC, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: LIVE_PK, NYC_ONLINE_PAYMENTS_ENABLED: 'yes' })
  assert.deepEqual(switchOff.chargeProblems, ['online_payments_switch_off'])
  assert.deepEqual(switchOff.webhookProblems, [], 'webhooks keep reconciling real payments while new charges are switched off')
  const mixed = guard.inspectNycStripeConfig({ STRIPE_SECRET_KEY: TEST_SK, NYC_STRIPE_ACCOUNT_ID: ACCT, STRIPE_WEBHOOK_SECRET: WHSEC, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: LIVE_PK, NYC_ONLINE_PAYMENTS_ENABLED: 'true' })
  assert.deepEqual(mixed.chargeProblems, ['publishable_key_mode_mismatch'])
  const noWebhook = guard.inspectNycStripeConfig({ STRIPE_SECRET_KEY: TEST_SK, NYC_STRIPE_ACCOUNT_ID: ACCT, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: TEST_PK, NYC_ONLINE_PAYMENTS_ENABLED: 'true' })
  assert.ok(noWebhook.chargeProblems.includes('webhook_secret_missing'))
  assert.equal(guard.secretKeyMode('rk_test_' + 'z'.repeat(30)), 'test')
})

behavior('guard: the secret key must belong to NYC_STRIPE_ACCOUNT_ID', () => {
  const guard = loadTs('lib/nycStripeGuard.ts')
  assert.doesNotThrow(() => guard.assertAccountMatches(ACCT, ACCT))
  assert.throws(() => guard.assertAccountMatches('acct_1SyracuseAccount', ACCT), err => err.reason === 'stripe_account_mismatch')
  assert.throws(() => guard.assertAccountMatches(undefined, ACCT), err => err.reason === 'stripe_account_unverifiable')
  const now = 1_000_000
  const cached = { secretKey: LIVE_SK, accountId: ACCT, verifiedAt: now - 1000 }
  assert.equal(guard.verificationIsFresh(cached, LIVE_SK, ACCT, now), true)
  assert.equal(guard.verificationIsFresh(cached, TEST_SK, ACCT, now), false, 'a new key must be re-verified')
  assert.equal(guard.verificationIsFresh(cached, LIVE_SK, 'acct_1OtherAccount', now), false, 'a new account id must be re-verified')
  assert.equal(guard.verificationIsFresh(cached, LIVE_SK, ACCT, now + guard.ACCOUNT_VERIFICATION_TTL_MS), false)
  assert.equal(guard.livemodeMatches(true, 'live'), true)
  assert.equal(guard.livemodeMatches(false, 'live'), false)
  assert.equal(guard.livemodeMatches(true, null), false)
})

behavior('metadata: server tags location=nyc and rejects mismatched associations', () => {
  const meta = loadTs('lib/nycPaymentMetadata.ts')
  const order = { id: 'ord_1', orderNumber: 'NYC-1001' }
  const built = meta.buildNycPaymentMetadata({ orderId: order.id, orderNumber: order.orderNumber, kind: 'checkout', principalCents: 12345, tipCents: 500, extra: { location: 'syracuse', orderId: 'evil', reason: 'x' } })
  assert.equal(built.location, 'nyc')
  assert.equal(built.orderId, 'ord_1')
  assert.equal(built.orderNumber, 'NYC-1001')
  assert.equal(built.principalCents, '12345')
  assert.equal(built.tipCents, '500')
  const ok = meta.checkNycPaymentMetadata(built, order)
  assert.equal(ok.ok, true)
  assert.equal(ok.tipCents, 500)
  assert.equal(meta.checkNycPaymentMetadata({ ...built, location: 'syracuse' }, order).reason, 'location_not_nyc')
  assert.equal(meta.checkNycPaymentMetadata(built, { id: 'ord_2', orderNumber: 'NYC-1001' }).reason, 'order_id_mismatch')
  assert.equal(meta.checkNycPaymentMetadata(built, { id: 'ord_1', orderNumber: 'NYC-9999' }).reason, 'order_number_mismatch')
  assert.equal(meta.checkNycPaymentMetadata({ ...built, tipCents: '-5' }, order).reason, 'tip_invalid')
  assert.equal(meta.checkNycPaymentMetadata(null, order).reason, 'metadata_missing')
  assert.throws(() => meta.buildNycPaymentMetadata({ orderId: 'o', orderNumber: 'n', kind: 'checkout', principalCents: 1.5, tipCents: 0 }))
  assert.equal(meta.dollarsToCents('19.99'), 1999)
  assert.ok(Number.isNaN(meta.dollarsToCents('abc')))
  assert.equal(meta.nycIdempotencyKey(['pi', 'ord 1', 500]), 'fpr-nyc:pi:ord1:500')
})

behavior('webhook ledger: duplicates are acknowledged, failures are retried', () => {
  const ledger = loadTs('lib/nycWebhookLedger.ts')
  const now = Date.now()
  assert.equal(ledger.decideWebhookClaim({ status: 'processed', updatedAt: new Date(now) }, now), 'duplicate')
  assert.equal(ledger.decideWebhookClaim({ status: 'ignored', updatedAt: new Date(now) }, now), 'duplicate')
  assert.equal(ledger.decideWebhookClaim({ status: 'rejected', updatedAt: new Date(now) }, now), 'duplicate')
  assert.equal(ledger.decideWebhookClaim({ status: 'processing', updatedAt: new Date(now - 1000) }, now), 'in_progress')
  assert.equal(ledger.decideWebhookClaim({ status: 'processing', updatedAt: new Date(now - ledger.WEBHOOK_STALE_PROCESSING_MS - 1) }, now), 'process')
  assert.equal(ledger.decideWebhookClaim({ status: 'failed', updatedAt: new Date(now) }, now), 'process')
  assert.deepEqual(ledger.NYC_HANDLED_STRIPE_EVENTS.slice().sort(), [
    'charge.dispute.created', 'charge.refund.updated', 'charge.refunded',
    'payment_intent.canceled', 'payment_intent.payment_failed', 'payment_intent.processing', 'payment_intent.succeeded',
  ])
})

function pricingConfig(overrides = {}) {
  return {
    items: {
      tent: { id: 'tent', name: 'Frame Tent 20x20', cost: 300, purchasable: true },
      chair: { id: 'chair', name: 'White Chair', cost: 2.5, purchasable: true },
      hidden: { id: 'hidden', name: 'Hidden', cost: 1, purchasable: false },
    },
    tiers: [
      { id: 'one', label: '1 Day', minDays: 1, maxDays: 1, percent: 0 },
      { id: 'two', label: '2 Days', minDays: 2, maxDays: 2, percent: 50 },
    ],
    specialRequestFees: [{ id: 'stake', name: 'Stake-down', amount: 25 }],
    coupon: { code: 'SAVE10', discountType: 'percentage', discountAmount: 10, isActive: true, expiresAt: null },
    taxRatePercent: 8.875,
    depositRule: { type: 'percentage', amount: 25 },
    deliveryFee: 75,
    now: new Date('2026-10-01T12:00:00Z'),
    ...overrides,
  }
}

const baseRequest = {
  items: [{ id: 'tent', quantity: 1 }, { id: 'chair', quantity: 40 }],
  eventDate: '2026-10-20',
  durationTierId: 'two',
  specialRequestIds: ['stake'],
  couponCode: 'save10',
  damageWaiver: true,
  exactDeliveryRequested: true,
  exactDeliveryTime: '10:00',
  pickupType: 'exact',
  exactPickupTime: '22:30',
  tipAmount: 20,
}

behavior('pricing: server total uses catalog prices, tiers, fees, coupon, tax and deposit', () => {
  const pricing = loadTs('lib/nycCheckoutPricing.ts')
  const result = pricing.computeNycCheckoutPricing(baseRequest, pricingConfig())
  // cart 300 + 100 = 400; 2-day tier +50% = 200; adjusted 600; coupon 10% of cart = 40
  assert.equal(result.cartSubtotal, 400)
  assert.equal(result.durationFee, 200)
  assert.equal(result.adjustedSubtotal, 600)
  assert.equal(result.couponDiscount, 40)
  assert.equal(result.couponCode, 'SAVE10')
  assert.equal(result.damageWaiverFee, 60)
  assert.equal(result.specialRequestFee, 25)
  assert.equal(result.exactDeliveryFee, 50)
  assert.equal(result.exactPickupFee, 75)
  assert.equal(result.lastMinuteFee, 0)
  // taxable = 560 + 75 + 60 + 25 + 0 + 125 = 845 ; tax 8.875% = 74.99
  assert.equal(result.taxAmount, 74.99)
  assert.equal(pricing.toCents(result.grandTotal), pricing.toCents(919.99))
  assert.equal(result.requiredDeposit, 230)
  assert.equal(pricing.toCents(result.totalWithTip), pricing.toCents(939.99))
  assert.equal(result.rentalDays, 2)
  assert.equal(result.lines[1].unitPrice, 2.5)
  assert.equal(result.lines[1].total, 100)
  assert.equal(pricing.sameCents(919.99, result.grandTotal), true)
  assert.equal(pricing.sameCents(1, result.grandTotal), false, 'a tampered browser total is detected')
})

behavior('pricing: fails closed when tax, deposit, or delivery pricing is not configured', () => {
  const pricing = loadTs('lib/nycCheckoutPricing.ts')
  const code = (overrides, request = baseRequest) => { try { pricing.computeNycCheckoutPricing(request, pricingConfig(overrides)); return 'ok' } catch (err) { return err.code } }
  assert.equal(code({ taxRatePercent: null }), 'tax_not_configured')
  assert.equal(code({ depositRule: null }), 'deposit_not_configured')
  assert.equal(code({ deliveryFee: 0 }), 'delivery_not_configured', 'an unconfigured delivery charge is never treated as free')
  assert.equal(code({}, { ...baseRequest, items: [{ id: 'hidden', quantity: 200 }] }), 'item_unavailable')
  assert.equal(code({}, { ...baseRequest, items: [{ id: 'missing', quantity: 1 }] }), 'item_unavailable')
  assert.equal(code({}, { ...baseRequest, items: [{ id: 'chair', quantity: 10 }] }), 'below_minimum')
  assert.equal(code({}, { ...baseRequest, items: [{ id: 'tent', quantity: 0.5 }] }), 'cart_invalid')
  assert.equal(code({}, { ...baseRequest, eventDate: '2026-10-02' }), 'event_too_soon')
  assert.equal(code({}, { ...baseRequest, tipAmount: -1 }), 'tip_invalid')
  assert.equal(code({}, { ...baseRequest, tipAmount: 5000 }), 'tip_too_large')
})

behavior('pricing: last-minute fee, expired coupons, fixed deposits and payment bounds', () => {
  const pricing = loadTs('lib/nycCheckoutPricing.ts')
  const soon = pricing.computeNycCheckoutPricing({ ...baseRequest, eventDate: '2026-10-03T18:00:00Z' }, pricingConfig())
  assert.equal(soon.lastMinuteFee, 49.99)
  const expired = pricing.computeNycCheckoutPricing(baseRequest, pricingConfig({ coupon: { code: 'SAVE10', discountType: 'percentage', discountAmount: 10, isActive: true, expiresAt: '2026-09-01' } }))
  assert.equal(expired.couponDiscount, 0)
  assert.equal(expired.couponCode, null)
  const fixed = pricing.computeNycCheckoutPricing(baseRequest, pricingConfig({ depositRule: { type: 'fixed', amount: 150 } }))
  assert.equal(fixed.requiredDeposit, 150)
  assert.equal(pricing.validateFirstPaymentPrincipal(150, fixed), 150)
  assert.throws(() => pricing.validateFirstPaymentPrincipal(149.99, fixed), err => err.code === 'payment_amount_out_of_range')
  assert.throws(() => pricing.validateFirstPaymentPrincipal(fixed.grandTotal + 0.01, fixed), err => err.code === 'payment_amount_out_of_range')
  assert.equal(pricing.exactPickupFeeFor('21:30'), 50)
  assert.equal(pricing.exactPickupFeeFor('23:30'), 75)
  const retired = pricing.computeNycCheckoutPricing({ ...baseRequest, specialRequestIds: ['stake', 'retired-fee'] }, pricingConfig())
  assert.equal(retired.specialRequestFee, 25, 'fees that are no longer offered are not charged')
  const firstTier = pricing.computeNycCheckoutPricing({ ...baseRequest, durationTierId: 'unknown' }, pricingConfig())
  assert.equal(firstTier.durationFee, 0, 'unknown tier falls back to the first tier exactly like the payment page')
})

// Mirrors the arithmetic in app/(public)/checkout/payment/page.tsx (what the customer sees).
function paymentPageTotals({ cart, tier, fees, couponDiscount, deliveryFee, taxRatePct, depositRule, damageWaiver, hoursUntilEvent, exactDeliveryFee, exactPickupFee }) {
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const durationFee = tier ? Math.round(subtotal * (tier.percent / 100) * 100) / 100 : 0
  const specialRequestTotal = fees.reduce((sum, fee) => sum + fee.amount, 0)
  const adjustedSubtotal = Math.round((subtotal + durationFee) * 100) / 100
  const lastMinuteFee = hoursUntilEvent >= 24 && hoursUntilEvent < 72 ? 49.99 : 0
  const damageWaiverFee = damageWaiver ? Math.round(adjustedSubtotal * 0.10 * 100) / 100 : 0
  const schedulingFeeTotal = exactDeliveryFee + exactPickupFee
  const taxableBase = Math.max(adjustedSubtotal - couponDiscount, 0) + deliveryFee + damageWaiverFee + specialRequestTotal + lastMinuteFee + schedulingFeeTotal
  const taxAmount = Math.round(taxableBase * (taxRatePct / 100) * 100) / 100
  const grandTotal = Math.max(adjustedSubtotal - couponDiscount, 0) + deliveryFee + damageWaiverFee + specialRequestTotal + taxAmount + lastMinuteFee + schedulingFeeTotal
  const depositAmount = depositRule.type !== 'percentage' ? Math.min(depositRule.amount, grandTotal) : Math.round(grandTotal * (depositRule.amount / 100) * 100) / 100
  return { grandTotal, depositAmount, taxAmount }
}

behavior('pricing parity: the server total equals the payment page total to the cent (randomized)', () => {
  const pricing = loadTs('lib/nycCheckoutPricing.ts')
  let seed = 20260929
  const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
  const prices = [0.5, 1.25, 2.5, 3.99, 7.75, 12, 19.99, 45, 89.95, 149.5, 250, 399.99, 1234.56]
  for (let run = 0; run < 500; run++) {
    const items = {}
    const cart = []
    const count = 1 + Math.floor(rand() * 5)
    for (let i = 0; i < count; i++) {
      const id = 'item' + i
      const cost = prices[Math.floor(rand() * prices.length)]
      const quantity = 1 + Math.floor(rand() * 60)
      items[id] = { id, name: 'Item ' + i, cost, purchasable: true }
      cart.push({ id, price: cost, quantity })
    }
    while (cart.reduce((s, i) => s + i.price * i.quantity, 0) < 100) cart[0].quantity += Math.ceil(100 / cart[0].price)
    const tiers = [{ id: 't1', label: '1 Day', minDays: 1, maxDays: 1, percent: 0 }, { id: 't2', label: '2 Days', minDays: 2, maxDays: 2, percent: [25, 33.33, 50][Math.floor(rand() * 3)] }]
    const tier = rand() < 0.5 ? tiers[0] : tiers[1]
    const fees = [{ id: 'f1', name: 'Stake', amount: 25 }, { id: 'f2', name: 'Overnight', amount: 49.95 }]
    const chosen = fees.filter(() => rand() < 0.5)
    const couponPct = [0, 5, 10, 15, 12.5][Math.floor(rand() * 5)]
    const taxRatePct = [4, 7.375, 8.375, 8.875][Math.floor(rand() * 4)]
    const depositRule = rand() < 0.5 ? { type: 'percentage', amount: [20, 25, 33.33, 50][Math.floor(rand() * 4)] } : { type: 'fixed', amount: [50, 100, 250][Math.floor(rand() * 3)] }
    const deliveryFee = [35, 49.5, 75, 125][Math.floor(rand() * 4)]
    const damageWaiver = rand() < 0.5
    const exactDelivery = rand() < 0.3
    const exactPickupTime = rand() < 0.3 ? (rand() < 0.5 ? '22:30' : '19:00') : null
    const now = new Date('2026-10-01T12:00:00Z')
    const eventDate = new Date(now.getTime() + (30 + Math.floor(rand() * 200)) * 3600 * 1000)
    const cartSubtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0)
    const couponDiscount = couponPct ? Math.round(cartSubtotal * (couponPct / 100) * 100) / 100 : 0
    const client = paymentPageTotals({
      cart, tier, fees: chosen, couponDiscount, deliveryFee, taxRatePct, depositRule, damageWaiver,
      hoursUntilEvent: (eventDate.getTime() - now.getTime()) / 3600000,
      exactDeliveryFee: exactDelivery ? 50 : 0,
      exactPickupFee: exactPickupTime ? (exactPickupTime === '22:30' ? 75 : 50) : 0,
    })
    const server = pricing.computeNycCheckoutPricing({
      items: cart.map(i => ({ id: i.id, quantity: i.quantity })),
      eventDate: eventDate.toISOString(),
      durationTierId: tier.id,
      specialRequestIds: chosen.map(f => f.id),
      couponCode: couponPct ? 'PCT' : null,
      damageWaiver,
      exactDeliveryRequested: exactDelivery,
      exactDeliveryTime: exactDelivery ? '10:00' : null,
      pickupType: exactPickupTime ? 'exact' : 'flexible',
      exactPickupTime,
      tipAmount: 0,
    }, {
      items, tiers, specialRequestFees: fees,
      coupon: couponPct ? { code: 'PCT', discountType: 'percentage', discountAmount: couponPct, isActive: true, expiresAt: null } : null,
      taxRatePercent: taxRatePct, depositRule, deliveryFee, now,
    })
    assert.equal(pricing.toCents(server.grandTotal), pricing.toCents(client.grandTotal), 'run ' + run)
    assert.equal(pricing.toCents(server.requiredDeposit), pricing.toCents(client.depositAmount), 'run ' + run)
    assert.equal(pricing.toCents(server.taxAmount), pricing.toCents(client.taxAmount), 'run ' + run)
  }
})
