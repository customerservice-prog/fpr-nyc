const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const snapshot = JSON.parse(fs.readFileSync(path.join(root, 'data/nyc-premium-price-snapshot-20260930.json'), 'utf8'))

function cleanNycPrice(raw) {
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) throw new Error('Invalid NYC price: ' + raw)
  if (Number.isInteger(value)) return value
  if (value < 10) return Math.ceil(value)
  if (value < 100) return Math.round(value)
  if (value < 500) return Math.round(value / 5) * 5
  if (value < 1000) return Math.round(value / 10) * 10
  return Math.round(value / 25) * 25
}

test('NYC premium source snapshot remains the captured Syracuse baseline at 70%', () => {
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

test('customer-facing NYC prices contain no cents and remain close to the 70% baseline', () => {
  for (const row of snapshot.items) {
    const clean = cleanNycPrice(row.nycPrice)
    assert.equal(Number.isInteger(clean), true, 'customer-facing cents remain: ' + row.slug)
    const delta = Math.abs(clean - row.nycPrice)
    const maxAllowed = Math.max(1, row.nycPrice * 0.03)
    assert.ok(delta <= maxAllowed, `clean price drifted too far from 70% baseline: ${row.slug} ${row.nycPrice} -> ${clean}`)
  }
})

test('NYC anchor prices are clean and visually sensible', () => {
  const bySlug = Object.fromEntries(snapshot.items.map(row => [row.slug, row]))
  const price = slug => cleanNycPrice(bySlug[slug].nycPrice)
  assert.equal(price('20x20-pole-tent'), 425)
  assert.equal(price('20x30-pole-tent'), 595)
  assert.equal(price('20x40-pole-tent'), 765)
  assert.equal(price('white-plastic-folding-chair'), 5)
  assert.equal(price('gold-chiavari-chair'), 20)
  assert.equal(price('foam-party-machine'), 470)
  assert.equal(price('cornhole'), 68)
  assert.equal(price('photobooth-3-hour-with-attendant'), 930)
  assert.equal(price('dance-floor-3x3-section'), 60)
})

test('price apply script only updates cost on existing matching slugs from the live Syracuse catalog', () => {
  const script = fs.readFileSync(path.join(root, 'scripts/apply-nyc-premium-prices.mjs'), 'utf8')
  assert.match(script, /nycPriceForSyracuseItem/)
  assert.match(script, /loadSyracuseCatalog/)
  assert.match(script, /data: \{ cost: change\.nycPrice \}/)
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

test('NYC quantities mirror Syracuse exactly by slug (owner decision 2026-09-30, supersedes own-stock)', () => {
  const script = fs.readFileSync(path.join(root, 'scripts/sync-nyc-quantities-from-syracuse.mjs'), 'utf8')
  assert.match(script, /loadSyracuseCatalog/)
  assert.match(script, /data: \{ quantity: change\.syracuseQuantity \}/)
  assert.doesNotMatch(script, /cost\s*:/, 'the quantity sync never changes prices')
  const engine = fs.readFileSync(path.join(root, 'scripts/nyc-catalog-sync-engine.mjs'), 'utf8')
  assert.doesNotMatch(engine, /method: 'POST'|method: 'PUT'|method: 'DELETE'|method: 'PATCH'/, 'Syracuse is only read')
  assert.match(fs.readFileSync(path.join(root, 'lib/nycCatalogCore.mjs'), 'utf8'), /quantity: Number\(source\.quantity\)/)
})
