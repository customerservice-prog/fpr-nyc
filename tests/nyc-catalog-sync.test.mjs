// NYC catalog mirror: pricing, packages, copy localization and the full sync engine
// (run against an in-memory database and a fake Syracuse API; no network, no DB).
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  catalogParityReport,
  cleanNycPrice,
  desiredNycItem,
  isPackageItem,
  localizeNycCatalogText,
  nycPriceForSyracuseItem,
  wrongMarketTerms,
} from '../lib/nycCatalogCore.mjs'
import { SourceUnavailableError, resolveSourceOrigin, runCatalogSync } from '../scripts/nyc-catalog-sync-engine.mjs'
import { syracuseCategories, syracuseHasPhoto, syracuseItems } from './fixtures/syracuse-catalog-sample.mjs'
import { PREDEPLOY_STEPS, runPredeploy } from '../scripts/nyc-predeploy.mjs'

const ORIGIN = 'https://www.friendlypartyrental.com'

test('clean NYC prices follow the owner examples and never show cents', () => {
  assert.equal(cleanNycPrice(4.25), 5)
  assert.equal(cleanNycPrice(20.38), 20)
  assert.equal(cleanNycPrice(59.5), 60)
  assert.equal(cleanNycPrice(467.5), 470)
  assert.equal(cleanNycPrice(933.3), 930)
  for (const whole of [425, 595, 765]) assert.equal(cleanNycPrice(whole), whole)
  for (let cents = 1; cents <= 500000; cents += 37) {
    const clean = cleanNycPrice(cents / 100)
    assert.equal(Number.isInteger(clean), true, String(cents))
    assert.ok(clean > 0)
  }
  assert.throws(() => cleanNycPrice(0))
  assert.throws(() => cleanNycPrice(-5))
})

const APPROVED_PACKAGES = [
  ['20x20-tent-package-4-tables-32-chairs', 325, 645],
  ['wedding-package-backyard-elopement', 345, 595],
  ['20x30-tent-8-tables-64-chairs-package-syracuse-ny', 530, 1045],
  ['wedding-package-classic-ceremony', 520, 995],
  ['30x30-tent-package-8-tables-80-chairs', 820, 1495],
  ['wedding-package-garden-reception', 2295, 3295],
  ['linen-tent-package-tent-tables-chairs-tablecloths-syracuse-ny', 425, 745],
  ['wedding-package-luxury-estate', 4995, 7495],
  ['bounce-house-package-4-tables-24-chairs', 275, 525],
  ['wedding-package-all-inclusive-premium', 7495, 12995],
  ['bounce-house-water-slide-combo-package', 500, 725],
  ['summer-splash-package-waterslide-tables-chairs-syracuse-ny', 350, 595],
  ['kids-birthday-party-package-bounce-house-cotton-candy-tables-chairs', 350, 695],
  ['graduation-party-package-small-seats-64-syracuse-ny', 665, 1045],
  ['graduation-party-package-large-seats-100-syracuse-ny', 875, 1595],
  ['backyard-bbq-party-package-tent-tables-chairs-popcorn-machine', 415, 725],
  ['corporate-event-package-tent-tables-chairs-concessions-syracuse-ny', 800, 1145],
]

function packageSource(slug, sourcePrice, index = 0) {
  return {
    id: 'source-package-' + index, slug, name: 'Rental Package ' + index,
    cost: sourcePrice, quantity: 10, displayToCustomer: true, type: 'Regular',
    description: `Package — $${sourcePrice}. Starting at $${sourcePrice.toFixed(2)}/day.`,
    category: { slug: 'party-rental-packages', name: 'Party Rental Packages' },
  }
}

test('all 17 approved Riverdale package prices survive source changes and stored/public slug aliases', () => {
  for (const [slug, sourcePrice, approved] of APPROVED_PACKAGES) {
    const source = packageSource(slug, sourcePrice)
    assert.equal(nycPriceForSyracuseItem(source), approved, slug)
    assert.equal(nycPriceForSyracuseItem({ ...source, cost: sourcePrice + 100 }), approved, 'source changes cannot overwrite approval: ' + slug)
    assert.equal(nycPriceForSyracuseItem({ ...source, slug: slug.replace(/-syracuse-ny$/, '') }), approved, 'short public alias: ' + slug)
    const desired = desiredNycItem(source, 0)
    assert.equal(desired.cost, approved, slug)
    assert.ok(desired.description.includes('Starting at $' + approved.toLocaleString('en-US') + '.00/day'), slug)
    assert.ok(desired.description.includes('Package — $' + approved.toLocaleString('en-US')), slug)
    assert.equal(desired.quantity, source.quantity, 'pricing never changes stock')
    assert.throws(() => nycPriceForSyracuseItem({ ...source, cost: 0 }), /Invalid Syracuse price/)
  }
})

test('ordinary items and future unlisted packages use clean(Syracuse x 1.70)', () => {
  const chair = { slug: 'white-plastic-folding-chair', name: 'White Plastic Folding Chair', cost: 2.5, category: { slug: 'table-chair-rentals', name: 'Table and Chair Rentals' } }
  for (const [cost, expected] of [[2.5, 5], [11.99, 20], [250, 425], [275, 470], [549, 930]]) {
    assert.equal(nycPriceForSyracuseItem({ ...chair, cost }), expected)
  }
  const byCategory = { slug: 'new-summer-splash', name: 'Summer Splash', cost: 350, category: { slug: 'party-rental-packages', name: 'Party Rental Packages' } }
  const byName = { slug: 'new-wedding-bundle', name: 'Wedding Package - New Bundle', cost: 520, category: { slug: 'weddings', name: 'Wedding Rentals' } }
  const bySlug = { slug: 'new-linen-tent-package', name: 'Linen Tent Bundle', cost: 425.5, category: { slug: 'tents', name: 'Tents' } }
  for (const pkg of [byCategory, byName, bySlug]) {
    assert.equal(isPackageItem(pkg), true, pkg.slug)
    assert.equal(nycPriceForSyracuseItem(pkg), cleanNycPrice(pkg.cost * 1.7), pkg.slug)
    assert.notEqual(nycPriceForSyracuseItem(pkg), pkg.cost, 'new packages cannot inherit the old package exemption')
  }
  assert.equal(isPackageItem(chair), false)
})

test('Syracuse catalog copy is localized for NYC with the NYC price', () => {
  const source = 'Rent a Cornhole set in Syracuse, NY from Friendly Party Rental. This classic yard game is a favorite. Starting at $40.00/day. Serving Syracuse and the surrounding Central New York area — reserve yours online today!'
  const text = localizeNycCatalogText(source, { price: 68 })
  assert.equal(text, 'Rent a Cornhole set in Riverdale, NY from Friendly Party Rental NYC. This classic yard game is a favorite. Starting at $68.00/day. Serving Riverdale, the Bronx and Lower Westchester — reserve yours online today!')
  assert.deepEqual(wrongMarketTerms(text), [])
  assert.equal(localizeNycCatalogText(text, { price: 68 }), text, 'idempotent')
  assert.equal(localizeNycCatalogText('Professional Popcorn Machine rental for your event in Syracuse, NY and Central New York.'), 'Professional Popcorn Machine rental for your event in Riverdale, the Bronx and Lower Westchester.')
  assert.equal(localizeNycCatalogText('Chafing fuel cans to keep buffet food warm at your Syracuse, NY event.'), 'Chafing fuel cans to keep buffet food warm at your Riverdale, Bronx or Lower Westchester event.')
  assert.equal(localizeNycCatalogText('Attended booth. Starting at $549.00/event. Serving Syracuse and the surrounding Central New York area — reserve yours online today!', { price: 930 }), 'Attended booth. Starting at $930.00/event. Serving Riverdale, the Bronx and Lower Westchester — reserve yours online today!')
  assert.equal(localizeNycCatalogText('Great chairs. Starting at $2.50/day. Book now.'), 'Great chairs. Book now.', 'no price: inherited price sentence removed')
  assert.equal(localizeNycCatalogText('Luxury Estate — $4,995 Complete reception setup.', { price: 4995 }), 'Luxury Estate — $4,995 Complete reception setup.')
  assert.equal(localizeNycCatalogText('Contact Friendly Party Rental before your event. Friendly Party Rental L.L.C. terms apply.'), 'Contact Friendly Party Rental NYC before your event. Friendly Party Rental L.L.C. terms apply.')
  assert.equal(localizeNycCatalogText(''), '')
  assert.equal(localizeNycCatalogText(null), '')
})

test('catalog sync localizes explicit source-price mentions without changing other amounts', () => {
  const source = { slug: 'photobooth-custom-image-layout-upgrade', name: 'Photobooth Custom Image Layout Upgrade', description: 'This optional $85 fee covers bespoke artwork. A separate $100 service is quoted independently.', cost: 85, quantity: 1, category: { slug: 'photo-booth-rentals', name: 'Photo Booth Rentals' } }
  const desired = desiredNycItem(source, 0)
  assert.equal(desired.cost, 145)
  assert.equal(desired.description, 'This optional $145 fee covers bespoke artwork. A separate $100 service is quoted independently.')
  assert.equal(localizeNycCatalogText(desired.description, { price: 145, sourcePrice: 85 }), desired.description)
  assert.equal(localizeNycCatalogText('Package includes $85 artwork.', { price: 85, sourcePrice: 85 }), 'Package includes $85 artwork.')
})

test('desired NYC item mirrors Syracuse fields; photo-less items stay unpublished', () => {
  const source = { id: 's1', slug: 'cornhole', name: 'Cornhole ', description: 'Rent in Syracuse, NY. Starting at $40.00/day.', type: 'Regular', cost: 40, quantity: 20, displayToCustomer: true, scheduleProfile: null, status: 'Available', bookableAfter: null, bookableAfterMessage: '', specialDisplayName: '', setupArea: '', attendants: null, ageGroup: '', colorOptions: [], taxable: true, setupFee: null, suggestedAddonIds: [], category: { slug: 'yard-game-rentals', name: 'Yard Games', pricingProfile: 'standard' } }
  const withPhoto = desiredNycItem(source, 3, { main: true, additional: 1 })
  assert.equal(withPhoto.name, 'Cornhole')
  assert.equal(withPhoto.cost, 68)
  assert.equal(withPhoto.quantity, 20)
  assert.equal(withPhoto.attendants, null, 'null attendants stays null (never 0)')
  assert.equal(withPhoto.sortOrder, 3)
  assert.equal(withPhoto.displayToCustomer, true)
  assert.equal(withPhoto.picture, ORIGIN + '/api/item-image/cornhole')
  assert.deepEqual(withPhoto.additionalImages, [ORIGIN + '/api/item-image/cornhole?index=0'])
  assert.equal(withPhoto.description, 'Rent in Riverdale, NY. Starting at $68.00/day.')
  const noPhoto = desiredNycItem(source, 3, { main: false, additional: 0 })
  assert.equal(noPhoto.displayToCustomer, false)
  assert.equal(noPhoto.picture, null)
  const unknown = desiredNycItem(source, 3, { main: null, additional: null })
  assert.equal('picture' in unknown, false, 'unknown photo state never overwrites the NYC photo')
  assert.equal(unknown.displayToCustomer, true)
})

test('catalog sync uses slug upserts so overlapping deploys cannot collide on creates', () => {
  const engine = fs.readFileSync(new URL('../scripts/nyc-catalog-sync-engine.mjs', import.meta.url), 'utf8')
  assert.match(engine, /tx\.category\.upsert\(\{\s*where: \{ slug: row\.category\.slug \}/)
  assert.match(engine, /tx\.item\.upsert\(\{ where: \{ slug: desired\.slug \}/)
  assert.doesNotMatch(engine, /await tx\.item\.create\(\{ data: \{ \.\.\.data, slug: desired\.slug/)
})

// ---------------------------------------------------------------------------
// Full engine run against an in-memory database and a fake Syracuse API.

function pickSelected(row, select) {
  if (!select) return { ...row }
  const out = {}
  for (const [key, on] of Object.entries(select)) if (on) out[key] = row[key]
  return out
}

class FakeDb {
  constructor({ categories, items }) {
    this.categories = categories.map((row) => ({ ...row }))
    this.items = items.map((row) => ({ suggestedAddonIds: [], additionalImages: [], picture: null, colorOptions: [], sortOrder: 0, ...row }))
    this.writes = 0
  }
  get category() {
    return {
      findMany: async ({ select } = {}) => this.categories.map((row) => pickSelected(row, select)),
      create: async ({ data }) => { this.writes++; const row = { id: 'cat-' + data.slug, ...data }; this.categories.push(row); return row },
      upsert: async ({ where, create, update }) => {
        this.writes++
        let row = this.categories.find((c) => c.slug === where.slug)
        if (row) Object.assign(row, update)
        else { row = { id: 'cat-' + create.slug, ...create }; this.categories.push(row) }
        return row
      },
      update: async ({ where, data }) => { this.writes++; const row = this.categories.find((c) => c.slug === where.slug); Object.assign(row, data); return row },
    }
  }
  get item() {
    return {
      findMany: async ({ where, select } = {}) => {
        let rows = this.items
        if (where && where.slug && where.slug.in) rows = rows.filter((row) => where.slug.in.includes(row.slug))
        return rows.map((row) => pickSelected(row, select))
      },
      create: async ({ data }) => { this.writes++; const row = { id: 'nyc-' + data.slug, suggestedAddonIds: [], ...data }; this.items.push(row); return row },
      upsert: async ({ where, create, update }) => {
        this.writes++
        let row = this.items.find((r) => r.slug === where.slug)
        if (row) Object.assign(row, update)
        else { row = { id: 'nyc-' + create.slug, suggestedAddonIds: [], ...create }; this.items.push(row) }
        return row
      },
      update: async ({ where, data }) => {
        this.writes++
        const row = this.items.find((r) => r.slug === where.slug)
        if (!row) throw new Error('No item ' + where.slug)
        Object.assign(row, data)
        return row
      },
      updateMany: async ({ where, data }) => {
        let count = 0
        for (const row of this.items) if (where.slug.in.includes(row.slug)) { Object.assign(row, data); count++ }
        this.writes += count
        return { count }
      },
    }
  }
  async $queryRawUnsafe() {
    return this.items.map((row) => ({
      slug: row.slug,
      picturePrefix: row.picture ? row.picture.slice(0, 400) : null,
      pictureLength: row.picture ? row.picture.length : 0,
      additionalCount: (row.additionalImages || []).length,
      additionalPrefixes: (row.additionalImages || []).length ? row.additionalImages.map((x) => x.slice(0, 400)).join('\u001f') : null,
    }))
  }
  async $transaction(work) {
    return typeof work === 'function' ? work(this) : Promise.all(work)
  }
}

function fakeSyracuse({ items = syracuseItems, down = false } = {}) {
  const calls = []
  const impl = async (url, init = {}) => {
    calls.push([init.method || 'GET', url])
    if (down) throw new Error('ECONNRESET')
    const { pathname, searchParams } = new URL(url)
    if (!url.startsWith(ORIGIN)) throw new Error('unexpected host ' + url)
    if ((init.method || 'GET') !== 'GET' && (init.method || 'GET') !== 'HEAD') throw new Error('Syracuse must only be read')
    if (pathname === '/api/items') return new Response(JSON.stringify({ items }), { status: 200, headers: { 'content-type': 'application/json' } })
    if (pathname === '/api/categories') return new Response(JSON.stringify({ categories: syracuseCategories }), { status: 200, headers: { 'content-type': 'application/json' } })
    const photo = pathname.match(/^\/api\/item-image\/(.+)$/)
    if (photo) {
      const slug = decodeURIComponent(photo[1])
      const index = searchParams.get('index')
      const has = syracuseHasPhoto(slug, index)
      return new Response(null, { status: has ? 200 : 404, headers: { 'content-type': has ? 'image/jpeg' : 'text/plain' } })
    }
    return new Response('Not found', { status: 404 })
  }
  return { impl, calls }
}

function nycStartingDb() {
  return new FakeDb({
    categories: [
      { id: 'nyc-cat-tent', slug: 'tent-rentals', name: 'Tents', pricingProfile: 'tables_tents', sortOrder: 9, displayToCustomer: true },
      { id: 'nyc-cat-chairs', slug: 'table-chair-rentals', name: 'Table and Chair Rentals', pricingProfile: 'tables_tents', sortOrder: 1, displayToCustomer: true },
      { id: 'nyc-cat-linen', slug: 'linen-rentals', name: 'Linens', pricingProfile: 'standard', sortOrder: 8, displayToCustomer: true },
      { id: 'nyc-cat-pkg', slug: 'party-rental-packages', name: 'Party Rental Packages', pricingProfile: 'standard', sortOrder: 5, displayToCustomer: true },
    ],
    items: [
      // copied earlier: Syracuse wording, wrong quantity, attendants 0, Syracuse add-on ID
      { id: 'nyc-tent', slug: '20x20-pole-tent', name: '20x20 Pole Tent', description: 'Pole tent. Starting at $250.00/day. Serving Syracuse and the surrounding Central New York area — reserve yours online today!', type: 'Regular', cost: 425, quantity: 3, displayToCustomer: true, scheduleProfile: null, categoryId: 'nyc-cat-tent', status: 'Available', bookableAfter: null, bookableAfterMessage: '', specialDisplayName: '', setupArea: '', attendants: 0, ageGroup: '', colorOptions: [], taxable: true, setupFee: null, suggestedAddonIds: ['syr-light'], picture: ORIGIN + '/api/item-image/20x20-pole-tent' },
      { id: 'nyc-chair', slug: 'white-plastic-folding-chair', name: 'White Plastic Folding Chair', description: '', type: 'Regular', cost: 4.25, quantity: 0, displayToCustomer: false, scheduleProfile: null, categoryId: 'nyc-cat-chairs', status: 'Available', bookableAfter: null, bookableAfterMessage: '', specialDisplayName: '', setupArea: '', attendants: null, ageGroup: '', colorOptions: [], taxable: true, setupFee: null, picture: 'data:image/png;base64,' + 'A'.repeat(900) },
      { id: 'nyc-pkg', slug: '20x20-tent-package-4-tables-32-chairs', name: '20x20 Tent Package – 4 Tables & 32 Chairs', description: '', type: 'Regular', cost: 552.5, quantity: 1, displayToCustomer: true, scheduleProfile: null, categoryId: 'nyc-cat-pkg', status: 'Available', bookableAfter: null, bookableAfterMessage: null, specialDisplayName: null, setupArea: null, attendants: null, ageGroup: null, colorOptions: [], taxable: true, setupFee: null },
      // an old public test product that Syracuse does not have
      { id: 'nyc-test', slug: 'ci-test-product', name: 'TEST product', description: '', type: 'Regular', cost: 1, quantity: 5, displayToCustomer: true, scheduleProfile: null, categoryId: 'nyc-cat-tent', status: 'Available', bookableAfter: null, bookableAfterMessage: null, specialDisplayName: null, setupArea: null, attendants: null, ageGroup: null, colorOptions: [], taxable: true, setupFee: null },
    ],
  })
}

test('catalog sync mirrors Syracuse exactly, verifies itself and is idempotent', async () => {
  const db = nycStartingDb()
  const syracuse = fakeSyracuse()
  const logs = []
  const result = await runCatalogSync({ prisma: db, fetchImpl: syracuse.impl, origin: ORIGIN, apply: true, log: (line) => logs.push(line) })
  assert.equal(result.applied, true)
  assert.ok(syracuse.calls.every(([method]) => method === 'GET' || method === 'HEAD'), 'Syracuse is only read')
  const by = (slug) => db.items.find((row) => row.slug === slug)
  // every Syracuse slug exists with the exact Syracuse quantity
  for (const source of syracuseItems) assert.equal(by(source.slug).quantity, source.quantity, source.slug)
  assert.equal(by('20x20-pole-tent').cost, 425)
  assert.equal(by('white-plastic-folding-chair').cost, 5)
  assert.equal(by('20x20-tent-package-4-tables-32-chairs').cost, 645, 'package keeps its approved Riverdale price')
  assert.equal(by('30-x-60-pole-tent').cost, 1445, '850 x 1.70 is already a whole-dollar price')
  assert.equal(by('20x20-pole-tent').attendants, null)
  assert.equal(by('20x20-pole-tent').description, 'Pole tent. Starting at $425.00/day. Serving Riverdale, the Bronx and Lower Westchester — reserve yours online today!')
  assert.deepEqual(by('20x20-pole-tent').suggestedAddonIds, [by('tent-lighting-20x20').id], 'add-on re-linked to the NYC item')
  assert.deepEqual(by('white-plastic-folding-chair').suggestedAddonIds, [by('spandex-chair-cover').id])
  assert.equal(by('white-plastic-folding-chair').picture, ORIGIN + '/api/item-image/white-plastic-folding-chair', 'Syracuse photo replaces the old inline copy')
  assert.equal(by('white-plastic-folding-chair').displayToCustomer, true)
  assert.deepEqual(by('30-x-60-pole-tent').additionalImages, [ORIGIN + '/api/item-image/30-x-60-pole-tent?index=0'])
  assert.equal(by('sugar-and-creamer-set').displayToCustomer, false, 'no Syracuse photo: kept but unpublished')
  assert.equal(by('sugar-and-creamer-set').quantity, 1000)
  assert.equal(by('100-lb-propane-tank').status, 'Damaged')
  assert.equal(new Date(by('madison-arbor').bookableAfter).toISOString(), '2026-11-01T00:00:00.000Z')
  assert.equal(by('ci-test-product').displayToCustomer, false, 'non-Syracuse public products are hidden')
  assert.equal(db.categories.find((c) => c.slug === 'tent-rentals').name, 'Tent Rentals')
  assert.equal(db.categories.find((c) => c.slug === 'tent-rentals').sortOrder, 2)
  assert.ok(db.categories.find((c) => c.slug === 'weddings'), 'missing Syracuse category created')
  const verified = JSON.parse(logs.find((line) => line.includes('"step": "verified"')))
  assert.deepEqual(Object.values(verified.failures).filter((count) => count !== 0), [])
  assert.equal(verified.counts.publicItems, syracuseItems.length - 1)

  const writesAfterFirstRun = db.writes
  const second = await runCatalogSync({ prisma: db, fetchImpl: fakeSyracuse().impl, origin: ORIGIN, apply: true, log: () => {} })
  assert.equal(second.plan.itemsToUpdate, 0)
  assert.equal(second.plan.itemsToCreate.length, 0)
  assert.equal(db.writes, writesAfterFirstRun, 'second run writes nothing')
})

test('full catalog sync applies all approved packages and remains idempotent after Syracuse reprices them', async () => {
  const db = nycStartingDb()
  const packages = APPROVED_PACKAGES.map(([slug, price], index) => packageSource(slug, price, index))
  await runCatalogSync({ prisma: db, fetchImpl: fakeSyracuse({ items: packages }).impl, origin: ORIGIN, apply: true, log: () => {} })
  for (const [slug, , approved] of APPROVED_PACKAGES) assert.equal(db.items.find(row => row.slug === slug).cost, approved, slug)
  const repriced = packages.map(item => ({ ...item, cost: item.cost + 50, description: item.description.replaceAll(String(item.cost), String(item.cost + 50)) }))
  await runCatalogSync({ prisma: db, fetchImpl: fakeSyracuse({ items: repriced }).impl, origin: ORIGIN, apply: true, log: () => {} })
  for (const [slug, , approved] of APPROVED_PACKAGES) assert.equal(db.items.find(row => row.slug === slug).cost, approved, 'source price changed: ' + slug)
  const writes = db.writes
  const repeated = await runCatalogSync({ prisma: db, fetchImpl: fakeSyracuse({ items: repriced }).impl, origin: ORIGIN, apply: true, log: () => {} })
  assert.equal(repeated.plan.itemsToUpdate, 0)
  assert.equal(db.writes, writes, 'same full source performs no additional writes')
})

test('catalog sync changes nothing when Syracuse is unreachable or returns a partial catalog', async () => {
  const db = nycStartingDb()
  await assert.rejects(runCatalogSync({ prisma: db, fetchImpl: fakeSyracuse({ down: true }).impl, origin: ORIGIN, apply: true, log: () => {} }), SourceUnavailableError)
  assert.equal(db.writes, 0)
  const big = new FakeDb({ categories: [], items: Array.from({ length: 50 }, (_, i) => ({ id: 'n' + i, slug: 'item-' + i, name: 'Item ' + i, cost: 10, quantity: 1, displayToCustomer: true, categoryId: 'c' })) })
  await assert.rejects(runCatalogSync({ prisma: big, fetchImpl: fakeSyracuse({ items: syracuseItems.slice(0, 3) }).impl, origin: ORIGIN, apply: true, log: () => {} }), /partial catalog/)
  assert.equal(big.writes, 0)
})

test('catalog source can only be overridden by a local test server', () => {
  assert.equal(resolveSourceOrigin({}), ORIGIN)
  assert.equal(resolveSourceOrigin({ NYC_CATALOG_SOURCE_ORIGIN: 'http://127.0.0.1:4010' }), 'http://127.0.0.1:4010')
  assert.throws(() => resolveSourceOrigin({ NYC_CATALOG_SOURCE_ORIGIN: 'https://evil.example' }))
})

test('parity report flags every kind of drift', () => {
  const nyc = syracuseItems.map((source, index) => {
    const desired = desiredNycItem(source, index)
    return { ...desired, category: { slug: desired.categorySlug } }
  })
  const clean = catalogParityReport({ syracuseItems, nycItems: nyc, noPhotoSlugs: [] })
  assert.equal(clean.missingSyracuseSlugs.length + clean.quantityMismatches.length + clean.priceMismatches.length + clean.customerCopyProblems.length + clean.visibilityMismatches.length, 0)
  const drifted = nyc.map((row) => row.slug === 'cornhole' ? row : ({ ...row }))
  drifted[0].quantity = 1
  drifted[1].cost = 170.5
  drifted[2].description = 'Serving Syracuse, NY'
  drifted.pop()
  const report = catalogParityReport({ syracuseItems, nycItems: drifted })
  assert.equal(report.quantityMismatches.length, 1)
  assert.equal(report.priceMismatches.length, 1)
  assert.equal(report.nonPackagePricesWithCents.length, 1)
  assert.equal(report.customerCopyProblems.length, 1)
  assert.deepEqual(report.missingSyracuseSlugs, ['madison-arbor'])
})

test('Railway pre-deploy entry point runs every step in order and stops at the first failure', () => {
  assert.deepEqual(PREDEPLOY_STEPS.map(([, args]) => args.join(' ')), [
    'scripts/verify-nyc-stripe-readiness.mjs',
    'scripts/sync-nyc-catalog-from-syracuse.mjs --apply',
    'scripts/apply-nyc-premium-prices.mjs --apply',
    'scripts/sync-nyc-quantities-from-syracuse.mjs --apply',
    'scripts/ensure-nyc-deposit-rule.mjs --apply',
    'prisma migrate deploy',
  ])
  const ran = []
  assert.equal(runPredeploy(PREDEPLOY_STEPS, (command, args) => { ran.push(args[0]); return { status: 0 } }), 0)
  assert.equal(ran.length, 6)
  const partial = []
  assert.equal(runPredeploy(PREDEPLOY_STEPS, (command, args) => { partial.push(args[0]); return { status: partial.length === 2 ? 4 : 0 } }), 4)
  assert.deepEqual(partial, ['scripts/verify-nyc-stripe-readiness.mjs', 'scripts/sync-nyc-catalog-from-syracuse.mjs'])
  assert.equal(runPredeploy(PREDEPLOY_STEPS, () => ({ status: null, error: new Error('spawn ENOENT') })), 1)
})
