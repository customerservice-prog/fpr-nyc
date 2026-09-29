const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const read = path => fs.readFileSync(path, 'utf8')
const migrationPath = 'prisma/migrations/20260929234500_restore_nyc_catalog_categories/migration.sql'

test('every advertised NYC category has a matching bootstrap record', () => {
  const section = read('lib/utils.ts').split('export const PUBLIC_CATEGORIES =')[1].split('export const WEDDING_PACKAGES')[0]
  const slugs = [...section.matchAll(/slug:\s*'([^']+)'/g)].map(match => match[1]).filter(slug => slug !== 'order-by-date')
  const sql = read(migrationPath)
  assert.equal(slugs.length, 18)
  for (const slug of slugs) assert.ok(sql.includes("('" + slug + "',"), slug)
  assert.match(sql, /ON CONFLICT \("slug"\) DO NOTHING/)
})

test('bootstrap does not overwrite prices, stock, credentials or business records', () => {
  const sql = read(migrationPath).split('\n').filter(line => !line.trim().startsWith('--')).join('\n')
  assert.doesNotMatch(sql, /\b(?:UPDATE|DELETE|TRUNCATE|DROP)\b/i)
  assert.doesNotMatch(sql, /INSERT INTO "(?:Item|User|Order|Customer|Payment|ServiceArea|CompanySettings)"/)
  assert.doesNotMatch(sql, /"(?:cost|quantity|password|baseFee)"/)
})

test('empty published categories are valid pages; missing and hidden categories remain 404', () => {
  const source = read('app/(public)/category/[slug]/page.tsx')
  const guard = source.indexOf('if (!category || !category.displayToCustomer) notFound()')
  const empty = source.indexOf('if (items.length === 0) return createElement(CategoryEmptyState')
  assert.ok(guard >= 0 && empty > guard)
  assert.ok(empty < source.indexOf('const initialCategory'))
  const state = read('components/public/CategoryEmptyState.tsx')
  assert.match(state, /No items are currently listed online/)
  assert.match(state, /does not confirm availability/)
  assert.match(state, /tel:/)
  assert.match(state, /sms:/)
  assert.doesNotMatch(state, /\$\d|Add to Cart|Sold Out/)
})

test('category browse links follow actual published records, not a second hard-coded catalog', () => {
  const page = read('app/(public)/category/page.tsx')
  assert.match(page, /where: \{ displayToCustomer: true \}/)
  assert.match(page, /categories=\{categories\}/)
  const browse = read('app/(public)/category/CategoryBrowse.tsx')
  assert.match(browse, /categories\.filter/)
  assert.doesNotMatch(browse, /PUBLIC_CATEGORIES\.filter|Greenville/)
})

test('single-category API honors visibility and returns only public item fields', () => {
  const source = read('app/api/categories/[slug]/route.ts')
  assert.match(source, /displayToCustomer: true/)
  assert.match(source, /select: PUBLIC_ITEM_SELECT/)
  assert.match(source, /status: 404/)
})
