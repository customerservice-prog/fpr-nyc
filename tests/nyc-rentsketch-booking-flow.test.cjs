const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function load(file, imports = {}) {
  const module = { exports: {} }
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(compiled, {
    module, exports: module.exports, Date, Map, Set,
    require: name => {
      assert.ok(name in imports, 'Unexpected runtime import ' + name)
      return imports[name]
    },
  })
  return module.exports
}
const core = load('lib/rentsketchBooking.ts')
const flow = load('lib/rentsketchBookingFlow.ts', { './rentsketchBooking': core })
const catalog = [
  { id: 'old-tent', slug: '20x20-pole-tent', name: '20x20 Pole Tent', cost: 425, quantity: 19 },
  { id: 'new-tent', slug: '20x30-pole-tent', name: '20x30 Pole Tent', cost: 595, quantity: 12 },
  { id: 'chairs', slug: 'white-plastic-folding-chair', name: 'White Plastic Folding Chair', cost: 4, quantity: 200 },
  { id: 'cooler', slug: '120-quart-hard-ice-chest-cooler', name: 'Cooler', cost: 85, quantity: 10 },
].map(item => ({ ...item, displayToCustomer: true, status: 'Available' }))
const date = '2027-06-12'
const previous = { designId: 'saved-design-example', itemIds: ['old-tent', 'chairs'], eventDate: date, source: 'designer', surfaceType: 'grass', importedAt: Date.now() }
const existing = [
  { id: 'old-tent', name: '20x20 Pole Tent', price: 425, quantity: 1, maxQuantity: 19 },
  { id: 'chairs', name: 'White Plastic Folding Chair', price: 4, quantity: 32, maxQuantity: 200 },
  { id: 'cooler', name: 'Cooler', price: 85, quantity: 1, maxQuantity: 10 },
]
const revised = { version: 1, tenant: 'friendly-nyc', designId: previous.designId, eventDate: date, source: 'designer', surfaceType: 'grass', items: [{ slug: '20x30-pole-tent', quantity: 1 }] }
const json = value => JSON.parse(JSON.stringify(value))

test('revised same design replaces its tent, removes deleted chairs, and retains unrelated cart rentals', () => {
  const result = flow.resolveExactDesignCart(revised, catalog, existing, date, previous)
  assert.deepEqual(json(result.items.map(item => [item.id, item.quantity])), [['cooler', 1], ['new-tent', 1]])
  assert.equal(result.subtotal, 680)
  assert.equal(result.issues.length, 0)
  assert.equal(existing.length, 3, 'Review must not mutate the current cart')
  const nextAttribution = { ...previous, itemIds: result.imported.map(item => item.id) }
  const reopened = flow.resolveExactDesignCart(revised, catalog, result.items, date, nextAttribution)
  assert.deepEqual(json(reopened.items), json(result.items), 'Reopening must not add another tent or cooler')
})

test('another saved design keeps unrelated earlier rentals but replaces matching selected quantities exactly', () => {
  const other = { ...revised, designId: 'other-design-example' }
  const result = flow.resolveExactDesignCart(other, catalog, existing, date, previous)
  assert.deepEqual(json(result.items.map(item => [item.id, item.quantity])), [['old-tent', 1], ['chairs', 32], ['cooler', 1], ['new-tent', 1]])
  const matching = { ...revised, items: [{ slug: 'white-plastic-folding-chair', quantity: 12 }] }
  const replaced = flow.resolveExactDesignCart(matching, catalog, existing, date, previous)
  assert.deepEqual(json(replaced.items.map(item => [item.id, item.quantity])), [['cooler', 1], ['chairs', 12]])
  assert.equal(replaced.subtotal, 133)
})

test('replacement remains blocked when revised rental exceeds live stock', () => {
  const unavailable = catalog.map(item => item.id === 'new-tent' ? { ...item, available: 0 } : item)
  const result = flow.resolveExactDesignCart(revised, unavailable, existing, date, previous)
  assert.ok(result.issues.some(issue => issue.includes('0 available')))
  assert.equal(existing[0].id, 'old-tent')
})

test('revised linen color removes imported White while unrelated Red of the same SKU remains', () => {
  const linen = { id: 'linen', slug: 'round-linen', name: 'Round Linen', cost: 30, quantity: 20, displayToCustomer: true, status: 'Available', colorOptions: ['White', 'Navy', 'Red'] }
  const cart = [
    { id: 'linen', name: 'Round Linen', price: 30, quantity: 4, maxQuantity: 20, selectedColor: 'White' },
    { id: 'linen', name: 'Round Linen', price: 30, quantity: 2, maxQuantity: 20, selectedColor: 'Red' },
    existing[2],
  ]
  const attribution = { ...previous, itemIds: ['linen'], itemKeys: [flow.cartVariantKey(cart[0])] }
  const plan = { ...revised, items: [{ slug: 'round-linen', quantity: 3, selectedColor: 'Navy' }] }
  const result = flow.resolveExactDesignCart(plan, [...catalog, linen], cart, date, attribution)
  assert.deepEqual(json(result.items.map(item => [item.id, item.selectedColor || '', item.quantity])), [['linen', 'Red', 2], ['cooler', '', 1], ['linen', 'Navy', 3]])
  assert.equal(result.subtotal, 235)
  assert.equal(result.issues.length, 0)
  const next = { ...attribution, itemKeys: result.imported.map(flow.cartVariantKey) }
  const repeated = flow.resolveExactDesignCart(plan, [...catalog, linen], result.items, date, next)
  assert.deepEqual(json(repeated.items), json(result.items))
})
