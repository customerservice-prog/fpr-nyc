const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const snapshot = JSON.parse(fs.readFileSync(path.join(root, 'data/nyc-premium-price-snapshot-20260930.json'), 'utf8'))

test('NYC premium price snapshot is exactly 70% above the captured Syracuse baseline', () => {
  assert.equal(snapshot.multiplier, 1.7)
  assert.equal(snapshot.source.repository, 'customerservice-prog/friendly-party-rental-app')
  assert.equal(snapshot.source.commit, '9329bf06e826375d06778f4a59b8ff647fae526c')
  assert.ok(snapshot.items.length >= 30)
  for (const row of snapshot.items) {
    assert.ok(row.slug)
    assert.ok(row.syracusePrice > 0)
    assert.equal(Math.round(row.syracusePrice * 1.7 * 100), Math.round(row.nycPrice * 100), row.slug)
    assert.ok(!Object.prototype.hasOwnProperty.call(row, 'quantity'), 'NYC snapshot must never copy Syracuse quantities')
  }
})

test('NYC high-end anchor prices match owner-approved 70% policy', () => {
  const bySlug = Object.fromEntries(snapshot.items.map(row => [row.slug, row]))
  assert.equal(bySlug['20x20-pole-tent'].nycPrice, 425)
  assert.equal(bySlug['20x30-pole-tent'].nycPrice, 595)
  assert.equal(bySlug['20x40-pole-tent'].nycPrice, 765)
  assert.equal(bySlug['white-plastic-folding-chair'].nycPrice, 4.25)
  assert.equal(bySlug['gold-chiavari-chair'].nycPrice, 13.6)
  assert.equal(bySlug['bounce-house-castle'].nycPrice, 338.3)
  assert.equal(bySlug['water-slide-14ft'].nycPrice, 508.3)
})

test('price apply script only updates cost on existing matching slugs', () => {
  const script = fs.readFileSync(path.join(root, 'scripts/apply-nyc-premium-prices.mjs'), 'utf8')
  assert.match(script, /updateMany\(\{ where: \{ slug: row\.slug \}, data: \{ cost: row\.nycPrice \} \}\)/)
  assert.doesNotMatch(script, /create\s*\(/)
  assert.doesNotMatch(script, /upsert\s*\(/)
  assert.doesNotMatch(script, /quantity\s*:/)
  assert.match(script, /Dry run only/)
})
