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

// Transpiles a project TypeScript module; '@/...' and relative imports of other
// pure project modules are loaded the same way.
function resolveProjectModule(fromFile, spec) {
  const base = spec.startsWith('@/') ? spec.slice(2) : path.join(path.dirname(fromFile), spec)
  for (const candidate of [base + '.ts', base + '.tsx', base]) {
    if (fs.existsSync(path.join(root, candidate)) && fs.statSync(path.join(root, candidate)).isFile()) return candidate
  }
  throw new Error('Cannot resolve ' + spec + ' from ' + fromFile)
}

function loadTs(file) {
  const ts = require('typescript')
  const source = read(file)
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: file,
  }).outputText
  const module = { exports: {} }
  const localRequire = spec => (spec.startsWith('@/') || spec.startsWith('.') ? loadTs(resolveProjectModule(file, spec)) : require(spec))
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', 'require', output)(module, module.exports, localRequire)
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
    assert.doesNotMatch(create.slice(0, 900), /payment_method_types\s*:/, file + ' should use Stripe dynamic payment methods')
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

// Test fixtures only (not approved NYC prices): the policy mirrors the fee values the
// inherited storefront used, so the arithmetic below stays comparable.
const TEST_POLICY = { minimumOrderSubtotal: 100, damageWaiverPercent: 10, lastMinuteFee: 49.99, exactDeliveryFee: 50, exactPickupFee: 50, lateExactPickupFee: 75, approvedOn: null }
const BRONX = { status: 'resolved', zip: '10471', ratePercent: 8.875, jurisdiction: { id: 'new-york-city', name: 'New York City (Bronx)', ratePercent: 8.875, reportingCode: '8081' } }

function pricingConfig(overrides = {}) {
  return {
    items: {
      tent: { id: 'tent', name: 'Frame Tent 20x20', cost: 300, purchasable: true },
      chair: { id: 'chair', name: 'White Chair', cost: 2.5, purchasable: true },
      hidden: { id: 'hidden', name: 'Hidden', cost: 1, purchasable: false },
      unpriced: { id: 'unpriced', name: 'Unpriced', cost: 0, purchasable: true },
    },
    tiers: [
      { id: 'one', label: '1 Day', minDays: 1, maxDays: 1, percent: 0 },
      { id: 'two', label: '2 Days', minDays: 2, maxDays: 2, percent: 50 },
    ],
    specialRequestFees: [{ id: 'stake', name: 'Stake-down', amount: 25 }],
    coupon: { code: 'SAVE10', discountType: 'percentage', discountAmount: 10, isActive: true, expiresAt: null },
    salesTax: BRONX,
    depositRule: { type: 'percentage', amount: 25 },
    deliveryFee: 75,
    policy: TEST_POLICY,
    phone: '315-884-1498',
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

behavior('pricing: server total uses catalog prices, tiers, fees, coupon, jurisdiction tax and deposit', () => {
  const pricing = loadTs('lib/nycCheckoutPricing.ts')
  const result = pricing.computeNycCheckoutPricing(baseRequest, pricingConfig())
  // cart 300 + 100 = 400; 2-day tier +50% = 200; adjusted 600; coupon 10% of cart = 40
  assert.equal(result.cartSubtotal, 400)
  assert.equal(result.durationFee, 200)
  assert.equal(result.adjustedSubtotal, 600)
  assert.equal(result.couponDiscount, 40)
  assert.equal(result.couponCode, 'SAVE10')
  assert.equal(result.damageWaiverFee, 60)
  assert.equal(result.damageWaiverPercent, 10)
  assert.equal(result.specialRequestFee, 25)
  assert.deepEqual(result.specialRequests, [{ id: 'stake', name: 'Stake-down', amount: 25 }])
  assert.equal(result.exactDeliveryFee, 50)
  assert.equal(result.exactPickupFee, 75)
  assert.equal(result.lastMinuteFee, 0)
  // taxable = 560 + 75 + 60 + 25 + 0 + 125 = 845 ; tax 8.875% = 74.99
  assert.equal(result.taxAmount, 74.99)
  assert.equal(result.taxRate, 8.875)
  assert.deepEqual(result.taxJurisdiction, { id: 'new-york-city', name: 'New York City (Bronx)', reportingCode: '8081', zip: '10471' })
  assert.equal(pricing.toCents(result.grandTotal), pricing.toCents(919.99))
  assert.equal(result.requiredDeposit, 230)
  assert.equal(pricing.toCents(result.totalWithTip), pricing.toCents(939.99))
  assert.equal(result.rentalDays, 2)
  assert.equal(result.lines[1].unitPrice, 2.5)
  assert.equal(result.lines[1].total, 100)
  assert.equal(result.version, 'nyc-server-pricing-v2')
  assert.equal(pricing.sameCents(919.99, result.grandTotal), true)
  assert.equal(pricing.sameCents(1, result.grandTotal), false, 'a tampered browser total is detected')
})

behavior('pricing: fails closed when tax, policy, deposit, or delivery pricing is missing', () => {
  const pricing = loadTs('lib/nycCheckoutPricing.ts')
  const code = (overrides, request = baseRequest) => { try { pricing.computeNycCheckoutPricing(request, pricingConfig(overrides)); return 'ok' } catch (err) { return err.code } }
  assert.equal(code({ salesTax: null }), 'tax_not_configured')
  assert.equal(code({ salesTax: { status: 'unknown_zip', zip: '10001' } }), 'tax_not_configured')
  assert.equal(code({ salesTax: { status: 'needs_address_review', zip: '10708', candidates: [{ name: 'Westchester County (outside the cities)' }, { name: 'Yonkers (city)' }] } }), 'tax_address_review')
  assert.equal(code({ policy: null }), 'checkout_policy_not_configured')
  assert.equal(code({ depositRule: null }), 'deposit_not_configured')
  assert.equal(code({ deliveryFee: 0 }), 'delivery_not_configured', 'an unconfigured delivery charge is never treated as free')
  assert.equal(code({ deliveryFee: NaN }), 'delivery_not_configured')
  assert.equal(code({}, { ...baseRequest, items: [{ id: 'hidden', quantity: 200 }] }), 'item_unavailable')
  assert.equal(code({}, { ...baseRequest, items: [{ id: 'missing', quantity: 1 }] }), 'item_unavailable')
  assert.equal(code({}, { ...baseRequest, items: [{ id: 'unpriced', quantity: 1 }, { id: 'tent', quantity: 1 }] }), 'item_unavailable', 'a $0 placeholder price is never sold online')
  assert.equal(code({}, { ...baseRequest, items: [{ id: 'chair', quantity: 10 }] }), 'below_minimum')
  assert.equal(code({ policy: { ...TEST_POLICY, minimumOrderSubtotal: 1500 } }), 'below_minimum', 'the approved minimum is enforced')
  assert.equal(code({}, { ...baseRequest, items: [{ id: 'tent', quantity: 0.5 }] }), 'cart_invalid')
  assert.equal(code({}, { ...baseRequest, eventDate: '2026-10-02' }), 'event_too_soon')
  assert.equal(code({}, { ...baseRequest, tipAmount: -1 }), 'tip_invalid')
  assert.equal(code({}, { ...baseRequest, tipAmount: 5000 }), 'tip_too_large')
})

behavior('pricing: optional fees are charged only when the approved policy offers them', () => {
  const pricing = loadTs('lib/nycCheckoutPricing.ts')
  const code = (overrides, request = baseRequest) => { try { pricing.computeNycCheckoutPricing(request, pricingConfig(overrides)); return 'ok' } catch (err) { return err.code } }
  const soon = { ...baseRequest, eventDate: '2026-10-03T18:00:00Z' }
  assert.equal(pricing.computeNycCheckoutPricing(soon, pricingConfig()).lastMinuteFee, 49.99)
  assert.equal(code({ policy: { ...TEST_POLICY, lastMinuteFee: null } }, soon), 'last_minute_not_offered')
  assert.equal(code({ policy: { ...TEST_POLICY, damageWaiverPercent: null } }), 'damage_waiver_not_offered')
  assert.equal(code({ policy: { ...TEST_POLICY, damageWaiverPercent: null } }, { ...baseRequest, damageWaiver: false }), 'ok')
  assert.equal(code({ policy: { ...TEST_POLICY, exactDeliveryFee: null } }), 'exact_delivery_not_offered')
  assert.equal(code({}, { ...baseRequest, exactDeliveryTime: null }), 'exact_time_invalid')
  assert.equal(code({ policy: { ...TEST_POLICY, exactPickupFee: null, lateExactPickupFee: null } }), 'exact_pickup_not_offered')
  assert.equal(code({ policy: { ...TEST_POLICY, lateExactPickupFee: null } }), 'exact_pickup_not_offered', '10:30 pm needs the late fee')
  assert.equal(pricing.computeNycCheckoutPricing({ ...baseRequest, exactPickupTime: '21:30' }, pricingConfig({ policy: { ...TEST_POLICY, lateExactPickupFee: null } })).exactPickupFee, 50)
  const custom = pricing.computeNycCheckoutPricing(baseRequest, pricingConfig({ policy: { ...TEST_POLICY, damageWaiverPercent: 12.5, exactDeliveryFee: 85, exactPickupFee: 60, lateExactPickupFee: 90 } }))
  assert.equal(custom.damageWaiverFee, 75)
  assert.equal(custom.exactDeliveryFee, 85)
  assert.equal(custom.exactPickupFee, 90)
  const none = pricing.computeNycCheckoutPricing({ ...baseRequest, damageWaiver: false, exactDeliveryRequested: false, pickupType: 'flexible', exactPickupTime: null }, pricingConfig({ policy: { ...TEST_POLICY, damageWaiverPercent: null, exactDeliveryFee: null, exactPickupFee: null, lateExactPickupFee: null } }))
  assert.equal(none.damageWaiverFee + none.exactDeliveryFee + none.exactPickupFee + none.lastMinuteFee, 0)
})

behavior('pricing: sales tax follows the delivery jurisdiction', () => {
  const pricing = loadTs('lib/nycCheckoutPricing.ts')
  const tax = loadTs('lib/nycSalesTax.ts')
  const request = { ...baseRequest, damageWaiver: false, exactDeliveryRequested: false, pickupType: 'flexible', exactPickupTime: null, couponCode: null, specialRequestIds: [], durationTierId: 'one', tipAmount: 0 }
  // taxable = 400 + 75 delivery = 475
  const bronx = pricing.computeNycCheckoutPricing(request, pricingConfig({ salesTax: tax.resolveNycSalesTax('10471') }))
  const mountVernon = pricing.computeNycCheckoutPricing(request, pricingConfig({ salesTax: tax.resolveNycSalesTax('10550') }))
  const yonkers = pricing.computeNycCheckoutPricing(request, pricingConfig({ salesTax: tax.resolveNycSalesTax('10701-1234') }))
  assert.equal(bronx.taxAmount, 42.16)
  assert.equal(mountVernon.taxAmount, 39.78)
  assert.equal(yonkers.taxAmount, 42.16)
  assert.equal(mountVernon.taxJurisdiction.reportingCode, '5521')
  assert.equal(yonkers.taxJurisdiction.reportingCode, '6511')
  assert.throws(() => pricing.computeNycCheckoutPricing(request, pricingConfig({ salesTax: tax.resolveNycSalesTax('10707') })), err => err.code === 'tax_address_review' && /10707/.test(err.message) && /315-884-1498/.test(err.message))
})

behavior('pricing: expired coupons, fixed deposits, retired fees and payment bounds', () => {
  const pricing = loadTs('lib/nycCheckoutPricing.ts')
  const expired = pricing.computeNycCheckoutPricing(baseRequest, pricingConfig({ coupon: { code: 'SAVE10', discountType: 'percentage', discountAmount: 10, isActive: true, expiresAt: '2026-09-01' } }))
  assert.equal(expired.couponDiscount, 0)
  assert.equal(expired.couponCode, null)
  const fixed = pricing.computeNycCheckoutPricing(baseRequest, pricingConfig({ depositRule: { type: 'fixed', amount: 150 } }))
  assert.equal(fixed.requiredDeposit, 150)
  assert.equal(pricing.validateFirstPaymentPrincipal(150, fixed), 150)
  assert.throws(() => pricing.validateFirstPaymentPrincipal(149.99, fixed), err => err.code === 'payment_amount_out_of_range')
  assert.throws(() => pricing.validateFirstPaymentPrincipal(fixed.grandTotal + 0.01, fixed), err => err.code === 'payment_amount_out_of_range')
  const retired = pricing.computeNycCheckoutPricing({ ...baseRequest, specialRequestIds: ['stake', 'retired-fee'] }, pricingConfig())
  assert.equal(retired.specialRequestFee, 25, 'fees that are no longer offered are not charged')
  const firstTier = pricing.computeNycCheckoutPricing({ ...baseRequest, durationTierId: 'unknown' }, pricingConfig())
  assert.equal(firstTier.durationFee, 0, 'an unknown tier falls back to the first tier')
})

behavior('pricing invariants hold for randomized carts (totals, tax rounding, deposit bounds)', () => {
  const pricing = loadTs('lib/nycCheckoutPricing.ts')
  const tax = loadTs('lib/nycSalesTax.ts')
  let seed = 20260930
  const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
  const prices = [0.5, 1.25, 2.5, 3.99, 7.75, 12, 19.99, 45, 89.95, 149.5, 250, 399.99, 1234.56]
  const zips = Object.keys(tax.NYC_ZIP_TAX_JURISDICTIONS).filter(zip => tax.resolveNycSalesTax(zip).status === 'resolved')
  for (let run = 0; run < 500; run++) {
    const items = {}
    const cart = []
    const count = 1 + Math.floor(rand() * 5)
    for (let i = 0; i < count; i++) {
      const id = 'item' + i
      const cost = prices[Math.floor(rand() * prices.length)]
      items[id] = { id, name: 'Item ' + i, cost, purchasable: true }
      cart.push({ id, quantity: 1 + Math.floor(rand() * 60) })
    }
    while (cart.reduce((s, i) => s + items[i.id].cost * i.quantity, 0) < 100) cart[0].quantity += Math.ceil(100 / items[cart[0].id].cost)
    const tiers = [{ id: 't1', label: '1 Day', minDays: 1, maxDays: 1, percent: 0 }, { id: 't2', label: '2 Days', minDays: 2, maxDays: 2, percent: [25, 33.33, 50][Math.floor(rand() * 3)] }]
    const fees = [{ id: 'f1', name: 'Stake', amount: 25 }, { id: 'f2', name: 'Overnight', amount: 49.95 }]
    const policy = { ...TEST_POLICY, damageWaiverPercent: [null, 10, 12.5][Math.floor(rand() * 3)], exactDeliveryFee: [null, 50, 85][Math.floor(rand() * 3)] }
    const now = new Date('2026-10-01T12:00:00Z')
    const salesTax = tax.resolveNycSalesTax(zips[Math.floor(rand() * zips.length)])
    const depositRule = rand() < 0.5 ? { type: 'percentage', amount: [20, 25, 33.33, 50][Math.floor(rand() * 4)] } : { type: 'fixed', amount: [50, 100, 250][Math.floor(rand() * 3)] }
    const request = {
      items: cart,
      eventDate: new Date(now.getTime() + (30 + Math.floor(rand() * 200)) * 3600 * 1000).toISOString(),
      durationTierId: rand() < 0.5 ? 't1' : 't2',
      specialRequestIds: fees.filter(() => rand() < 0.5).map(f => f.id),
      couponCode: rand() < 0.3 ? 'PCT' : null,
      damageWaiver: policy.damageWaiverPercent !== null && rand() < 0.5,
      exactDeliveryRequested: policy.exactDeliveryFee !== null && rand() < 0.3,
      exactDeliveryTime: '10:00',
      pickupType: rand() < 0.3 ? 'exact' : 'flexible',
      exactPickupTime: rand() < 0.5 ? '22:30' : '19:00',
      tipAmount: 0,
    }
    const result = pricing.computeNycCheckoutPricing(request, {
      items, tiers, specialRequestFees: fees, policy, salesTax, depositRule, deliveryFee: [35, 49.5, 75, 125][Math.floor(rand() * 4)], now,
      coupon: { code: 'PCT', discountType: 'percentage', discountAmount: 12.5, isActive: true, expiresAt: null },
    })
    const discounted = Math.max(result.adjustedSubtotal - result.couponDiscount, 0)
    const taxable = discounted + result.deliveryFee + result.damageWaiverFee + result.specialRequestFee + result.lastMinuteFee + result.exactDeliveryFee + result.exactPickupFee
    assert.ok(Math.abs(result.taxAmount - taxable * (salesTax.ratePercent / 100)) <= 0.005 + 1e-9, 'tax is the jurisdiction rate rounded to the cent, run ' + run)
    assert.equal(pricing.toCents(result.taxAmount * 100) % 100, 0, 'tax is a whole number of cents, run ' + run)
    assert.equal(pricing.toCents(result.grandTotal), pricing.toCents(taxable + result.taxAmount), 'run ' + run)
    assert.ok(result.requiredDeposit >= 0 && pricing.toCents(result.requiredDeposit) <= pricing.toCents(result.grandTotal), 'run ' + run)
    assert.equal(result.taxRate, salesTax.ratePercent)
  }
})
