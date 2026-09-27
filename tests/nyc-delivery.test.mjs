import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DeliveryQuoteError, normalizeDeliveryZip, requireDeliveryMethod, requireMatchingDeliveryFee, getDeliveryQuote } from '../lib/delivery.ts'
import { migrateDeliveryOnlySession } from '../lib/delivery-session.ts'

const source = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const statusIs = (status) => (error) => error instanceof DeliveryQuoteError && error.status === status

test('NYC delivery ZIP normalization accepts ZIP and ZIP+4', () => {
  assert.equal(normalizeDeliveryZip('10463'), '10463')
  assert.equal(normalizeDeliveryZip(' 10463-1234 '), '10463')
})
for (const value of [null, undefined, '', 'abcde', '1046', '104631', '10463abc', 10463]) {
  test(`reject malformed ZIP ${JSON.stringify(value)}`, () => assert.throws(() => normalizeDeliveryZip(value), statusIs(400)))
}

for (const value of ['delivery', '', null, undefined]) {
  test(`allow delivery or missing legacy method ${JSON.stringify(value)}`, () => assert.doesNotThrow(() => requireDeliveryMethod(value)))
}
for (const value of ['pickup', 'Pickup', 'delivery ', 'warehouse', 1]) {
  test(`reject non-delivery method ${JSON.stringify(value)}`, () => assert.throws(() => requireDeliveryMethod(value), statusIs(400)))
}

test('approved NYC ZIP returns only its configured fee', async () => {
  const previous = process.env.NYC_DELIVERY_FEES_JSON
  process.env.NYC_DELIVERY_FEES_JSON = JSON.stringify({ '10463': 65, '10701': 85 })
  try {
    assert.deepEqual(await getDeliveryQuote('10463'), {
      fee: 65, zip: '10463', distance: null, isEstimate: false, distanceBasis: 'configured-zip-fee',
    })
    assert.equal((await getDeliveryQuote('10463-1234')).fee, 65)
    assert.equal((await getDeliveryQuote('10701')).fee, 85)
  } finally {
    if (previous === undefined) delete process.env.NYC_DELIVERY_FEES_JSON
    else process.env.NYC_DELIVERY_FEES_JSON = previous
  }
})

test('approved ZIP with no configured price blocks checkout rather than guessing', async () => {
  const previous = process.env.NYC_DELIVERY_FEES_JSON
  process.env.NYC_DELIVERY_FEES_JSON = JSON.stringify({ '10463': 65 })
  try {
    await assert.rejects(getDeliveryQuote('10701'), statusIs(503))
  } finally {
    if (previous === undefined) delete process.env.NYC_DELIVERY_FEES_JSON
    else process.env.NYC_DELIVERY_FEES_JSON = previous
  }
})

test('outside-area ZIP is rejected even if someone tries to configure a fee', async () => {
  const previous = process.env.NYC_DELIVERY_FEES_JSON
  process.env.NYC_DELIVERY_FEES_JSON = JSON.stringify({ '13206': 1 })
  try {
    await assert.rejects(getDeliveryQuote('13206'), statusIs(400))
  } finally {
    if (previous === undefined) delete process.env.NYC_DELIVERY_FEES_JSON
    else process.env.NYC_DELIVERY_FEES_JSON = previous
  }
})

test('matching delivery fee is accepted and stale/manipulated fees are rejected', async () => {
  const previous = process.env.NYC_DELIVERY_FEES_JSON
  process.env.NYC_DELIVERY_FEES_JSON = JSON.stringify({ '10463': 65 })
  try {
    const quote = await getDeliveryQuote('10463')
    assert.doesNotThrow(() => requireMatchingDeliveryFee(65, quote))
    for (const fee of [0, null, undefined, '65', 64.99, NaN, Infinity]) {
      assert.throws(() => requireMatchingDeliveryFee(fee, quote), statusIs(409))
    }
  } finally {
    if (previous === undefined) delete process.env.NYC_DELIVERY_FEES_JSON
    else process.env.NYC_DELIVERY_FEES_JSON = previous
  }
})

function storage(initial = {}) {
  const data = new Map(Object.entries(initial))
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: (key) => data.delete(key) }
}

test('old warehouse-pickup cart migrates to delivery without losing cart items or event date', () => {
  const local = storage({
    fpr_delivery_type: 'pickup',
    fpr_bookingMethod: 'pickup',
    fpr_cart: '[{"id":"test-item","quantity":2}]',
    fpr_event_date: 'Nov 14, 2026',
    fpr_event_time_slot: 'Warehouse appointment',
    fpr_pickup_time_slot: 'Return appointment',
    fpr_scheduling_details: '{"pickupType":"exact"}',
  })
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

test('existing delivery and crew event-collection schedule are preserved', () => {
  const local = storage({
    fpr_delivery_type: 'delivery',
    fpr_event_time_slot: '10am - 12pm',
    fpr_pickup_time_slot: 'Next morning',
    fpr_scheduling_details: '{"pickupType":"exact","exactPickupTime":"22:00"}',
  })
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

test('public order validation enforces NYC delivery quote before database writes', () => {
  const code = source('app/api/orders/route.ts')
  const firstDatabaseAction = code.indexOf('await prisma.')
  assert.ok(code.indexOf('requireDeliveryMethod(body?.deliveryType)') < firstDatabaseAction)
  assert.ok(code.indexOf('requireMatchingDeliveryFee(deliveryFee, deliveryQuote)') < firstDatabaseAction)
  assert.match(code, /deliveryType: 'delivery'/)
  assert.match(code, /deliveryDistance: deliveryQuote\.distance/)
  assert.match(code, /eventState: eventState \|\| 'NY'/)
  assert.doesNotMatch(code, /eventState: eventState \|\| 'SC'/)
})

test('checkout draft defaults the event state to New York and uses the same delivery quote', () => {
  const code = source('app/api/checkout/draft/route.ts')
  assert.match(code, /const eventState = clean\(body\.eventState, 20\) \|\| 'NY'/)
  assert.match(code, /const deliveryQuote = await getDeliveryQuote\(eventZip\)/)
  assert.match(code, /deliveryType: 'delivery'/)
})

test('payment page requires a complete NYC delivery quote before payment', () => {
  const code = source('app/(public)/checkout/payment/page.tsx')
  assert.match(code, /if \(!totalsReady\)/)
  assert.match(code, /disabled=\{loading \|\| !totalsReady/)
  assert.match(code, /requireDeliveryMethod\(checkoutData\.deliveryType\)/)
  assert.match(code, /normalizeDeliveryZip\(checkoutData\.eventZip\) !== deliveryQuoteZip/)
  assert.doesNotMatch(code, /deliveryTypeState === 'pickup'/)
})
