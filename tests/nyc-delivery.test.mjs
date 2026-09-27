import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { DeliveryQuoteError, calculateDeliveryFee, normalizeDeliveryZip, requireDeliveryMethod, requireMatchingDeliveryFee, getDeliveryQuote } from '../lib/delivery.ts'
import { migrateDeliveryOnlySession } from '../lib/delivery-session.ts'

const source = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const statusIs = (status) => (error) => error instanceof DeliveryQuoteError && error.status === status

for (const [miles, fee] of [[0, 29.99], [5, 29.99], [5.01, 49.99], [15, 49.99], [15.01, 90.03], [20, 109.99], [100, 429.99]]) {
  test(`existing delivery tier at ${miles} miles is $${fee}`, () => assert.equal(calculateDeliveryFee(miles), fee))
}
for (const value of [-1, NaN, Infinity, -Infinity]) {
  test(`invalid distance ${value} cannot produce a free quote`, () => assert.throws(() => calculateDeliveryFee(value), statusIs(503)))
}
for (const value of ['29601', ' 29601 ', '29601-1234']) {
  test(`normalize supported ZIP ${JSON.stringify(value)}`, () => assert.equal(normalizeDeliveryZip(value), '29601'))
}
for (const value of [null, undefined, '', 'abcde', '2960', '296011', '29601abc', '29601/1234', 29601]) {
  test(`reject malformed ZIP ${JSON.stringify(value)}`, () => assert.throws(() => normalizeDeliveryZip(value), statusIs(400)))
}
for (const value of ['delivery', '', null, undefined]) {
  test(`allow delivery or missing legacy method ${JSON.stringify(value)}`, () => assert.doesNotThrow(() => requireDeliveryMethod(value)))
}
for (const value of ['pickup', 'Pickup', 'delivery ', 'warehouse', 1]) {
  test(`reject non-delivery method ${JSON.stringify(value)}`, () => assert.throws(() => requireDeliveryMethod(value), statusIs(400)))
}

test('warehouse ZIP charges minimum without a network request', async () => {
  const quote = await getDeliveryQuote('29601', async () => { throw new Error('This must not be called') })
  assert.deepEqual(quote, { fee: 29.99, distance: 0, zip: '29601', isEstimate: true, distanceBasis: 'zip-centroid-straight-line' })
})
test('warehouse ZIP+4 uses the same minimum', async () => assert.equal((await getDeliveryQuote('29601-1234')).fee, 29.99))
test('nearby synthetic ZIP-coordinate fixture uses the close tier', async () => {
  let requestedUrl = ''
  const quote = await getDeliveryQuote('29607', async (url) => {
    requestedUrl = url
    return jsonResponse({ places: [{ latitude: '34.9000', longitude: '-82.406' }] })
  })
  assert.equal(requestedUrl, 'https://api.zippopotam.us/us/29607')
  assert.equal(quote.fee, 29.99)
  assert.ok(quote.distance > 0)
  assert.equal(quote.isEstimate, true)
})
test('middle-distance synthetic fixture preserves the $49.99 tier', async () => {
  const quote = await getDeliveryQuote('29615', async () => jsonResponse({ places: [{ latitude: '34.97', longitude: '-82.406' }] }))
  assert.equal(quote.fee, 49.99)
  assert.ok(quote.distance > 5 && quote.distance <= 15)
})
test('unknown ZIP is rejected instead of priced at zero', async () => {
  await assert.rejects(getDeliveryQuote('00000', async () => jsonResponse({}, 404)), statusIs(400))
})
test('upstream outage blocks quoting', async () => {
  await assert.rejects(getDeliveryQuote('29607', async () => jsonResponse({}, 503)), statusIs(503))
})
test('network failure blocks quoting', async () => {
  await assert.rejects(getDeliveryQuote('29607', async () => { throw new TypeError('offline') }), statusIs(503))
})
test('invalid upstream JSON blocks quoting', async () => {
  await assert.rejects(getDeliveryQuote('29607', async () => new Response('not json')), statusIs(503))
})
for (const place of [{}, { latitude: null, longitude: null }, { latitude: '', longitude: '' }, { latitude: 'NaN', longitude: '-82' }, { latitude: '91', longitude: '-82' }, { latitude: '34', longitude: '181' }]) {
  test(`invalid coordinate fixture ${JSON.stringify(place)} is not a quote`, async () => {
    await assert.rejects(getDeliveryQuote('29607', async () => jsonResponse({ places: [place] })), statusIs(503))
  })
}
test('matching delivery fee is accepted', async () => {
  const quote = await getDeliveryQuote('29601')
  assert.doesNotThrow(() => requireMatchingDeliveryFee(29.99, quote))
})
for (const fee of [0, null, undefined, '29.99', 29.98, NaN, Infinity]) {
  test(`reject missing, stale, or manipulated delivery fee ${String(fee)}`, async () => {
    const quote = await getDeliveryQuote('29601')
    assert.throws(() => requireMatchingDeliveryFee(fee, quote), statusIs(409))
  })
}

function storage(initial = {}) {
  const data = new Map(Object.entries(initial))
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: (key) => data.delete(key) }
}
test('old pickup cart migrates without losing items or event date', () => {
  const local = storage({ fpr_delivery_type: 'pickup', fpr_bookingMethod: 'pickup', fpr_cart: '[{"id":"test-item","quantity":2}]', fpr_event_date: 'Nov 14, 2026', fpr_event_time_slot: 'Warehouse appointment', fpr_pickup_time_slot: 'Return appointment', fpr_scheduling_details: '{"pickupType":"exact"}' })
  const session = storage({ checkout_data: '{"deliveryType":"pickup"}' })
  assert.equal(migrateDeliveryOnlySession(local, session), true)
  assert.equal(local.getItem('fpr_delivery_type'), 'delivery')
  assert.equal(local.getItem('fpr_bookingMethod'), 'delivery')
  assert.equal(local.getItem('fpr_cart'), '[{"id":"test-item","quantity":2}]')
  assert.equal(local.getItem('fpr_event_date'), 'Nov 14, 2026')
  assert.equal(local.getItem('fpr_event_time_slot'), null)
  assert.equal(local.getItem('fpr_pickup_time_slot'), null)
  assert.equal(local.getItem('fpr_scheduling_details'), null)
  assert.equal(session.getItem('checkout_data'), null)
})
test('pickup stored only in category bookingMethod also migrates', () => {
  const local = storage({ fpr_bookingMethod: 'pickup' })
  assert.equal(migrateDeliveryOnlySession(local, storage()), true)
  assert.equal(local.getItem('fpr_bookingMethod'), 'delivery')
})
test('pickup stored only in payment checkout_data also migrates', () => {
  const session = storage({ checkout_data: '{"deliveryType":"pickup"}' })
  assert.equal(migrateDeliveryOnlySession(storage(), session), true)
  assert.equal(session.getItem('checkout_data'), null)
})
test('existing delivery and crew event-collection schedule are preserved', () => {
  const local = storage({ fpr_delivery_type: 'delivery', fpr_event_time_slot: '10am - 12pm', fpr_pickup_time_slot: 'Next morning', fpr_scheduling_details: '{"pickupType":"exact","exactPickupTime":"22:00"}' })
  const session = storage({ checkout_data: '{"deliveryType":"delivery"}' })
  assert.equal(migrateDeliveryOnlySession(local, session), false)
  assert.equal(local.getItem('fpr_pickup_time_slot'), 'Next morning')
  assert.equal(local.getItem('fpr_scheduling_details'), '{"pickupType":"exact","exactPickupTime":"22:00"}')
  assert.equal(session.getItem('checkout_data'), '{"deliveryType":"delivery"}')
})
test('malformed checkout data is cleared safely', () => {
  const session = storage({ checkout_data: 'broken json' })
  assert.doesNotThrow(() => migrateDeliveryOnlySession(storage(), session))
  assert.equal(session.getItem('checkout_data'), null)
})
test('public order validation precedes every database action', () => {
  const code = source('app/api/orders/route.ts')
  const firstDatabaseAction = code.indexOf('await prisma.')
  assert.ok(code.indexOf('requireDeliveryMethod(body?.deliveryType)') < firstDatabaseAction)
  assert.ok(code.indexOf('requireMatchingDeliveryFee(deliveryFee, deliveryQuote)') < firstDatabaseAction)
  assert.match(code, /deliveryType: 'delivery'/)
  assert.match(code, /deliveryDistance: deliveryQuote.distance/)
  assert.doesNotMatch(code, /eventState \|\| 'NY'/)
})
test('cart migration runs in layout effect before passive category restoration', () => {
  const code = source('components/public/CartContext.tsx')
  assert.match(code, /useLayoutEffect\(\(\) => \{[\s\S]*?migrateDeliveryOnlySession\(localStorage, sessionStorage\)/)
  assert.doesNotMatch(code, /setDeliveryTypeState\(savedDeliveryType\)/)
})
test('payment handler and button both require complete pricing', () => {
  const code = source('app/(public)/checkout/payment/page.tsx')
  assert.match(code, /if \(!totalsReady\)/)
  assert.match(code, /disabled=\{loading \|\| !totalsReady/)
  assert.match(code, /requireDeliveryMethod\(checkoutData.deliveryType\)/)
  assert.match(code, /normalizeDeliveryZip\(checkoutData.eventZip\) !== deliveryQuoteZip/)
  assert.match(code, /not a street-address or driving-distance measurement/)
  assert.doesNotMatch(code, /setDeliveryFee\(data.fee \|\| 0\)/)
  assert.doesNotMatch(code, /deliveryTypeState === 'pickup'/)
})

// Explicit opt-in only. Public GETs plus one deliberately incomplete pickup request;
// it cannot create an order even on the old implementation (required fields absent).
// No customer data, payment intents, card information, emails, or valid orders are used.
test('live Riverdale public delivery smoke', { skip: process.env.RUN_NYC_DELIVERY_SMOKE !== '1', timeout: 300000 }, async () => {
  const base = 'https://fpr-nyc-production.up.railway.app'
  const results = []
  async function check(path, expectedStatus, validate, init) {
    const response = await fetch(base + path, { ...init, signal: AbortSignal.timeout(15000), cache: 'no-store' })
    const body = await response.json()
    results.push({ path, status: response.status, body })
    assert.equal(response.status, expectedStatus, path)
    validate(body)
  }
  // Allow the current Railway deployment to finish; no false pass on old code.
  let ready = false
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const response = await fetch(base + '/api/delivery-fee?zip=29601', { signal: AbortSignal.timeout(6000), cache: 'no-store' })
      const body = await response.json()
      if (response.ok && body.isEstimate === true && body.zip === '29601' && body.fee === 29.99) { ready = true; break }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 3000))
  }
  try {
    assert.ok(ready, 'The new Riverdale delivery API must be live, not only committed')
    await check('/api/delivery-fee?zip=29601', 200, (body) => { assert.equal(body.fee, 29.99); assert.equal(body.distanceBasis, 'zip-centroid-straight-line') })
    await check('/api/delivery-fee?zip=29601-1234', 200, (body) => assert.equal(body.fee, 29.99))
    await check('/api/delivery-fee?zip=29607', 200, (body) => assert.equal(body.fee, 29.99))
    await check('/api/delivery-fee?zip=29615', 200, (body) => assert.equal(body.fee, 49.99))
    await check('/api/delivery-fee?zip=29303', 200, (body) => { assert.ok(body.fee > 49.99); assert.equal(body.isEstimate, true) })
    await check('/api/delivery-fee?zip=abcde', 400, (body) => assert.ok(body.error))
    await check('/api/delivery-fee?zip=00000', 400, (body) => assert.ok(body.error))
    await check('/api/orders', 400, (body) => assert.match(body.error, /delivery only/i), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"deliveryType":"pickup"}' })
    await check('/api/tax-rate', 200, (body) => assert.equal(typeof body.rate?.rate, 'number'))
    await check('/api/deposit-rule', 200, (body) => assert.equal(typeof body.rule?.amount, 'number'))
    await check('/api/pricing-tiers', 200, (body) => assert.ok(Array.isArray(body.tiers)))
    await check('/api/special-request-fees', 200, (body) => assert.ok(Array.isArray(body.fees)))
  } finally {
    mkdirSync('test-results', { recursive: true })
    writeFileSync('test-results/sc-delivery-live.json', JSON.stringify({ testedAt: new Date().toISOString(), origin: base, results }, null, 2))
    console.log(JSON.stringify(results, null, 2))
  }
})
