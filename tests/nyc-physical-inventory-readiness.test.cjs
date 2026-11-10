const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function loadSummary() {
  const file = 'lib/nycPhysicalInventoryReadiness.ts'
  const source = fs.readFileSync(file, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const module = { exports: {} }
  vm.runInNewContext(compiled, { module, exports: module.exports, Set, Map, Number, Date }, { filename: file })
  return module.exports.summarizeNycPhysicalInventory
}
const summarize = loadSummary()
const fresh = new Date('2026-11-08T12:00:00Z')

test('only current, staff-confirmed NYC items count as verified', () => {
  const catalog = ['staged', 'partner', 'unavailable', 'not-checked', 'stale', 'invalid', 'missing', 'staged']
  const confirmations = [
    { itemSlug: 'staged', status: 'confirmed', source: 'nyc_stock', verifiedQuantity: 12, verifiedAt: fresh },
    { itemSlug: 'partner', status: 'confirmed', source: 'partner_committed', verifiedQuantity: 3, verifiedAt: fresh },
    { itemSlug: 'unavailable', status: 'unavailable', source: 'unknown', verifiedQuantity: 0, verifiedAt: fresh },
    { itemSlug: 'not-checked', status: 'unverified', source: 'unknown', verifiedQuantity: 0, verifiedAt: null },
    { itemSlug: 'stale', status: 'confirmed', source: 'nyc_stock', verifiedQuantity: 4, verifiedAt: null },
    { itemSlug: 'invalid', status: 'confirmed', source: 'unknown', verifiedQuantity: 8, verifiedAt: fresh },
    { itemSlug: 'removed-syracuse-item', status: 'confirmed', source: 'nyc_stock', verifiedQuantity: 1000, verifiedAt: fresh },
  ]
  const result = summarize(catalog, confirmations)
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    catalogItems: 7, confirmed: 2, unverified: 4, unavailable: 1,
    physicallyStaged: 1, supplierCommitted: 1,
  })
})

test('empty catalog and old orphan records cannot imply NYC is ready', () => {
  const result = summarize([], [
    { itemSlug: 'removed-item', status: 'confirmed', source: 'nyc_stock', verifiedQuantity: 1000, verifiedAt: fresh },
  ])
  assert.equal(result.catalogItems, 0)
  assert.equal(result.confirmed, 0)
  assert.equal(result.unverified, 0)
})

test('NYC launch dashboard is admin-only and does not modify reservations or silently fake zeroes', () => {
  const src = fs.readFileSync('app/admin/settings/nyc-launch-readiness/page.tsx', 'utf8')
  assert.match(src, /getServerSession\(authOptions\)/)
  assert.match(src, /role !== 'admin'/)
  assert.match(src, /prisma\.nycPhysicalStockVerification\.findMany/)
  assert.match(src, /summarizeNycPhysicalInventory/)
  assert.match(src, /Inventory verification data is currently unavailable/)
  assert.match(src, /Unavailable items are blocked from online bookings/)
  assert.match(src, /Unverified items cannot be booked online until physical stock or supplier commitments are confirmed/)
  assert.doesNotMatch(src, /prisma\.(?:item|order|payment)\.(?:update|create|delete|upsert)/)
  assert.doesNotMatch(src, /stripe\.paymentIntents|sendEmail\(/)
})
