const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const snapshot = JSON.parse(fs.readFileSync(path.join(root, 'data/nyc-premium-price-snapshot-20260930.json'), 'utf8'))

test('NYC premium price snapshot is exactly 70% above the captured Syracuse baseline', () => {
  assert.equal(snapshot.multiplier, 1.7)
  assert.equal(snapshot.source.kind, 'live-public-api')
  assert.equal(snapshot.source.publishedPricedCount, 216)
  assert.equal(snapshot.source.nonPackageCount, 198)
  assert.equal(snapshot.source.excludedPackageCount, 18)
  assert.equal(snapshot.items.length, 198)
  for (const row of snapshot.items) {
    assert.ok(row.slug)
    assert.ok(row.syracusePrice > 0)
    assert.equal(Math.round(row.syracusePrice * 1.7 * 100), Math.round(row.nycPrice * 100), row.slug)
    assert.ok(!Object.prototype.hasOwnProperty.call(row, 'quantity'), 'NYC snapshot must never copy Syracuse quantities')
    const packageText = `${row.name} ${row.slug} ${row.categorySlug || ''}`.toLowerCase()
    assert.equal(packageText.includes('package'), false, 'package accidentally included: ' + row.slug)
  }
})

test('NYC high-end anchor prices match owner-approved 70% policy', () => {
  const bySlug = Object.fromEntries(snapshot.items.map(row => [row.slug, row]))
  assert.equal(bySlug['20x20-pole-tent'].nycPrice, 425)
  assert.equal(bySlug['20x30-pole-tent'].nycPrice, 595)
  assert.equal(bySlug['20x40-pole-tent'].nycPrice, 765)
  assert.equal(bySlug['white-plastic-folding-chair'].nycPrice, 4.25)
  assert.equal(bySlug['gold-chiavari-chair'].nycPrice, 13.6)
  assert.equal(bySlug['foam-party-machine'].nycPrice, 467.5)
  assert.equal(bySlug['cornhole'].nycPrice, 68)
  assert.equal(bySlug['photobooth-3-hour-with-attendant'].nycPrice, 933.3)
  assert.equal(bySlug['dance-floor-3x3-section'].nycPrice, 59.5)
})

test('price apply script only updates cost on existing matching slugs', () => {
  const script = fs.readFileSync(path.join(root, 'scripts/apply-nyc-premium-prices.mjs'), 'utf8')
  assert.match(script, /updateMany\(\{ where: \{ slug: row\.slug \}, data: \{ cost: row\.nycPrice \} \}\)/)
  assert.doesNotMatch(script, /create\s*\(/)
  assert.doesNotMatch(script, /upsert\s*\(/)
  assert.doesNotMatch(script, /quantity\s*:/)
  assert.match(script, /Dry run only/)
})

test('all package prices remain excluded and unchanged by the NYC premium snapshot', () => {
  assert.equal(snapshot.packageExclusion.excluded.length, 18)
  for (const row of snapshot.packageExclusion.excluded) {
    const text = `${row.name} ${row.slug} ${row.categorySlug || ''}`.toLowerCase()
    assert.equal(text.includes('package'), true, 'excluded row is not recognizably a package: ' + row.slug)
  }
  const excludedSlugs = new Set(snapshot.packageExclusion.excluded.map(row => row.slug))
  for (const row of snapshot.items) assert.equal(excludedSlugs.has(row.slug), false)
})
