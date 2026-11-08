const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const read = (relative) => fs.readFileSync(path.join(process.cwd(), relative), 'utf8')

test('NYC public legal pages use Riverdale identity and disclose actual booking constraints', () => {
  const rentals = read('app/(public)/rental-policies/page.tsx')
  const privacy = read('app/(public)/privacy-policy/page.tsx')
  for (const source of [rentals, privacy]) {
    assert.match(source, /nycPageMetadata/)
    assert.match(source, /BUSINESS/)
    assert.doesNotMatch(source, /315-884-1498|330 Costello|Minoa|Syracuse, NY|Greenville|864-610/)
    assert.match(source, /9172747857/)
  }
  assert.match(rentals, /January 1, 2027/)
  assert.match(rentals, /Delivery-only service area/)
  assert.match(rentals, /individual signed rental agreement/)
  assert.match(privacy, /Stripe/)
  assert.match(privacy, /authorized|authorize/i)
  assert.match(privacy, /retained/i)
})

test('every NYC footer design links the rental policies and privacy pages', () => {
  const footer = read('components/public/Footer.tsx')
  assert.match(footer, /href="\/rental-policies"/)
  assert.match(footer, /href="\/privacy-policy"/)
  assert.equal((footer.match(/<NycCustomerPolicies/g)||[]).length, 3)
})

test('NYC checkout and payment make policies discoverable before payment', () => {
  for (const route of ['app/(public)/checkout/page.tsx', 'app/(public)/checkout/payment/page.tsx']) {
    const source = read(route)
    assert.match(source, /href="\/rental-policies"/)
    assert.match(source, /href="\/privacy-policy"/)
  }
})

test('NYC sitemap exposes policy URLs using the separate NYC canonical domain', () => {
  const seo = read('lib/nycSeo.ts')
  const sitemap = read('app/sitemap.ts')
  assert.match(seo, /'\/rental-policies'/)
  assert.match(seo, /'\/privacy-policy'/)
  assert.match(sitemap, /NYC_STATIC_SEARCH_PATHS/)
  assert.doesNotMatch(seo, /friendlypartyrental\.com\//)
})
