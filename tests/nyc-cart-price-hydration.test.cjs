const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function providerHarness(savedItems) {
  const states = []; let cursor = 0; let hydrate; let value; const calls = []
  const data = new Map(Object.entries({
    fpr_cart: JSON.stringify(savedItems), fpr_event_date: '2027-11-14',
    fpr_event_time_slot: '12:00–18:00', fpr_duration_tier: 'two-days',
    fpr_pickup_time_slot: '18:00', fpr_exact_time_requested: 'true',
    fpr_scheduling_details: JSON.stringify({ eventStartTime: '12:00', eventEndTime: '18:00', exactDeliveryTime: '10:00', exactDeliveryFee: 50 }),
  }))
  const storage = { getItem: key => data.get(key) || null, setItem: (key, v) => data.set(key, v), removeItem: key => data.delete(key) }
  const react = {
    createContext: () => ({ Provider: 'provider' }),
    createElement: (_, props) => { value = props.value; return null },
    useState: initial => { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next }] },
    useLayoutEffect: callback => { hydrate = callback }, useEffect() {}, useCallback: callback => callback, useContext: () => value,
  }
  let resolve; const pending = new Promise(done => { resolve = done })
  const context = { exports: {}, AbortController, localStorage: storage, sessionStorage: storage,
    fetch: (url, options) => { calls.push({ url, options }); return pending },
    require: name => {
      if (name === 'react') return react
      if (name === '@/lib/delivery-session') return { migrateDeliveryOnlySession() {} }
      if (name === '@/lib/rentsketchBooking') return { RENTSKETCH_ATTRIBUTION_KEY: 'booking', bookingDateKey: v => v }
      if (name === '@/lib/nycBookingWindow') return {
        NYC_PUBLIC_BOOKING_MESSAGE: '2027 only',
        isNycPublicBookingDateOpen: value => typeof value === 'string' && value >= '2027-01-01',
      }
      throw new Error('Unexpected dependency: ' + name)
    },
  }
  const code = ts.transpileModule(fs.readFileSync('components/public/CartContext.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText
  vm.runInNewContext(code, context)
  function render() { cursor = 0; context.exports.CartProvider({ children: null }); return value }
  render(); const cleanup = hydrate(); render()
  return { render, cleanup, calls, resolve }
}
const line = { id: 'package', name: 'Tent Package', price: 325, quantity: 2, maxQuantity: 10, selectedColor: 'White', eventDate: '2027-11-14', picture: '/photo.jpg' }
const settle = () => new Promise(resolve => setImmediate(resolve))

test('updating or removing one real linen color preserves the other color line and rate', () => {
  const base = { id: 'cmunkulfu0031nvjhcw17lcr5', name: '120 inch Round Polyester Tablecloth', price: 34, maxQuantity: 20, eventDate: '2027-11-14' }
  const green = { ...base, selectedColor: 'Hunter Emerald Green', quantity: 2 }
  const navy = { ...base, selectedColor: 'Navy Blue', quantity: 3 }
  const h = providerHarness([green, navy])
  h.render().updateQuantity(base.id, 4, green.selectedColor)
  assert.deepEqual(JSON.parse(JSON.stringify(h.render().items)), [{ ...green, quantity: 4 }, navy])
  h.render().removeItem(base.id, green.selectedColor)
  assert.deepEqual(JSON.parse(JSON.stringify(h.render().items)), [navy])
  assert.equal(h.render().subtotal, 102)
  h.cleanup()
})

test('malformed saved entries cannot crash hydration while valid legacy rentals and colors stay intact', async () => {
  const navy = { ...line, name: 'Round Linen', selectedColor: 'Navy', quantity: 3 }
  const legacy = { ...line, id: 'legacy-tent', name: 'Pole Tent' }
  delete legacy.selectedColor
  const h = providerHarness([null, {}, 'bad', [], { ...line, name: {} }, { ...line, quantity: -1 }, { ...line, selectedColor: {} }, navy, legacy])
  const restored = h.render()
  assert.deepEqual(JSON.parse(JSON.stringify(restored.items)), [navy, legacy])
  assert.equal(restored.loaded, true)
  assert.equal(restored.subtotal, 1625)
  h.resolve({ ok: true, json: async () => ({ items: [{ id: 'package', cost: 30 }, { id: 'legacy-tent', cost: 425 }] }) })
  await settle()
  assert.deepEqual(JSON.parse(JSON.stringify(h.render().items)), [{ ...navy, price: 30 }, { ...legacy, price: 425 }])
  const onlyBad = providerHarness([null])
  assert.equal(onlyBad.render().items.length, 0)
  assert.equal(onlyBad.calls.length, 0)
})

test('saved cart refreshes live prices while preserving concurrent quantities, colors, dates and scheduling', async () => {
  const h = providerHarness([line, { ...line, id: 'removed' }])
  assert.equal(h.calls.length, 1)
  assert.equal(h.calls[0].url, '/api/items')
  assert.equal(h.calls[0].options.method, 'GET')
  assert.equal(h.calls[0].options.cache, 'no-store')
  const cart = h.render(); cart.updateQuantity('package', 4, 'White'); cart.removeItem('removed', 'White')
  cart.addItem({ ...line, id: 'new', price: 22, quantity: 1 })
  h.resolve({ ok: true, json: async () => ({ items: [{ id: 'package', cost: 645 }, { id: 'removed', cost: 100 }] }) })
  await settle(); const updated = h.render()
  assert.deepEqual(JSON.parse(JSON.stringify(updated.items)), [{ ...line, price: 645, quantity: 4 }, { ...line, id: 'new', price: 22, quantity: 1 }])
  assert.equal(updated.subtotal, 2602)
  assert.equal(updated.eventDate, '2027-11-14'); assert.equal(updated.durationTierId, 'two-days')
  assert.equal(updated.eventTimeSlot, '12:00–18:00'); assert.equal(updated.pickupTimeSlot, '18:00')
  assert.equal(updated.exactTimeRequested, true); assert.equal(updated.schedulingDetails.exactDeliveryFee, 50)
})

test('empty saved carts do not fetch and late price refresh cannot resurrect a cleared cart', async () => {
  assert.equal(providerHarness([]).calls.length, 0)
  const h = providerHarness([line]); h.render().clearCart()
  h.resolve({ ok: true, json: async () => ({ items: [{ id: 'package', cost: 645 }] }) })
  await settle(); assert.equal(h.render().items.length, 0)
})

test('malformed prices and failed/aborted refreshes leave saved cart details intact', async () => {
  for (const response of [ { ok: false }, { ok: true, json: async () => ({ items: [{ id: 'package', cost: null }, { id: 'package', cost: NaN }, { id: 'package', cost: -1 }] }) } ]) {
    const h = providerHarness([line]); h.resolve(response); await settle(); assert.equal(h.render().items[0].price, 325)
  }
  const h = providerHarness([line]); h.cleanup(); h.resolve({ ok: true, json: async () => ({ items: [{ id: 'package', cost: 645 }] }) })
  await settle(); assert.equal(h.render().items[0].price, 325)
})
