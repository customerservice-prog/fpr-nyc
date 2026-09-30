// NYC launch hardening (2026-09-30): exact-cent checkout math, exact-time windows,
// stock shared by colors and held for the whole rental, retry-safe orders, customer
// records that the public checkout cannot overwrite, Syracuse-equivalent photos, and
// NYC-only customer copy. Static source checks plus behavior of the pure modules.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

function loadTs(file) {
  const ts = require('typescript')
  const output = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: file,
  }).outputText
  const module = { exports: {} }
  const localRequire = spec => {
    if (spec.startsWith('@/') || spec.startsWith('.')) {
      const base = spec.startsWith('@/') ? spec.slice(2) : path.join(path.dirname(file), spec)
      return loadTs(fs.existsSync(path.join(root, base + '.ts')) ? base + '.ts' : base)
    }
    return require(spec)
  }
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', 'require', output)(module, module.exports, localRequire)
  return module.exports
}

let hasTypescript = true
try { require.resolve('typescript') } catch { hasTypescript = false }
const behavior = hasTypescript ? test : test.skip

const POLICY = { minimumOrderSubtotal: 750, damageWaiverPercent: null, lastMinuteFee: null, exactDeliveryFee: 250, exactPickupFee: 250, lateExactPickupFee: 350, approvedOn: '2026-09-30' }
const BRONX = { status: 'resolved', zip: '10471', ratePercent: 8.875, jurisdiction: { id: 'new-york-city', name: 'New York City (Bronx)', ratePercent: 8.875, reportingCode: '8081' } }
function config(overrides = {}) {
  return {
    items: {
      tent: { id: 'tent', name: '20 x 30 Frame Tent', cost: 810, purchasable: true },
      chair: { id: 'chair', name: 'White Plastic Folding Chair', cost: 5, purchasable: true },
      table: { id: 'table', name: '6ft Plastic Folding Table', cost: 22, purchasable: true },
    },
    tiers: [],
    specialRequestFees: [],
    coupon: null,
    salesTax: BRONX,
    depositRule: { type: 'percentage', amount: 25 },
    deliveryFee: 225,
    policy: POLICY,
    phone: '315-884-1498',
    now: new Date('2026-10-01T12:00:00Z'),
    ...overrides,
  }
}
const request = (overrides = {}) => ({ items: [{ id: 'tent', quantity: 1 }], eventDate: '2026-10-20', tipAmount: 0, ...overrides })

behavior('money math is exact to the cent (half-cent tax rounds up, never down)', () => {
  const pricing = loadTs('lib/nycCheckoutPricing.ts')
  assert.equal(pricing.percentOfCents(83600, 8.875), 7420, '$836.00 x 8.875% = $74.195 -> $74.20')
  assert.equal(pricing.percentOfCents(48000, 8.875), 4260)
  assert.equal(pricing.percentOfCents(49500, 8.375), 4146)
  assert.equal(pricing.percentOfCents(52260, 25), 13065)
  // 810 + 225 delivery = 1035 taxable; 8.875% = 91.85625 -> 91.86; total 1126.86; 25% deposit = 281.715 -> 281.72
  const result = pricing.computeNycCheckoutPricing(request(), config())
  assert.equal(result.cartSubtotal, 810)
  assert.equal(result.deliveryFee, 225)
  assert.equal(result.taxAmount, 91.86)
  assert.equal(result.grandTotal, 1126.86)
  assert.equal(result.requiredDeposit, 281.72)
  for (let cents = 75000; cents < 76000; cents += 7) {
    const r = pricing.computeNycCheckoutPricing(request(), config({ items: { tent: { id: 'tent', name: 'Tent', cost: cents / 100, purchasable: true } } }))
    for (const value of [r.taxAmount, r.grandTotal, r.requiredDeposit, r.totalWithTip]) assert.equal(Math.round(value * 100) / 100, value, 'whole cents: ' + value)
  }
})

behavior('$750 minimum, 25% deposit, tip rounding and fee manipulation', () => {
  const pricing = loadTs('lib/nycCheckoutPricing.ts')
  const code = (req, cfg = config()) => { try { pricing.computeNycCheckoutPricing(req, cfg); return 'ok' } catch (error) { return error.code } }
  assert.equal(code(request({ items: [{ id: 'chair', quantity: 149 }] })), 'below_minimum', '$745 is below the $750 minimum')
  assert.equal(code(request({ items: [{ id: 'chair', quantity: 150 }] })), 'ok', '$750 meets the minimum')
  assert.equal(pricing.computeNycCheckoutPricing(request({ tipAmount: 10.456 }), config()).tipAmount, 10.46)
  assert.equal(code(request({ tipAmount: -1 })), 'tip_invalid')
  assert.equal(code(request({ tipAmount: 5000 })), 'tip_too_large')
  assert.equal(code(request({ damageWaiver: true })), 'damage_waiver_not_offered')
  assert.equal(code(request(), config({ depositRule: { type: 'percentage', amount: 250 } })), 'deposit_not_configured')
})

behavior('exact-time fees: only the offered 30-minute times, late pickup 10:00-11:30 pm at $350', () => {
  const pricing = loadTs('lib/nycCheckoutPricing.ts')
  const run = scheduling => pricing.computeNycCheckoutPricing(request(scheduling), config())
  const code = scheduling => { try { run(scheduling); return 'ok' } catch (error) { return error.code } }
  assert.equal(run({ exactDeliveryRequested: true, exactDeliveryTime: '10:00' }).exactDeliveryFee, 250)
  assert.equal(run({ pickupType: 'exact', exactPickupTime: '21:30' }).exactPickupFee, 250)
  assert.equal(run({ pickupType: 'exact', exactPickupTime: '22:00' }).exactPickupFee, 350)
  assert.equal(run({ pickupType: 'exact', exactPickupTime: '23:30' }).exactPickupFee, 350)
  for (const time of ['23:45', '00:30', '06:00', '11:30', '12:15', '25:00', 'noon', '']) {
    assert.equal(code({ pickupType: 'exact', exactPickupTime: time }), 'exact_time_invalid', 'pickup ' + time)
  }
  for (const time of ['07:30', '18:30', '10:15', '23:00']) {
    assert.equal(code({ exactDeliveryRequested: true, exactDeliveryTime: time }), 'exact_time_invalid', 'delivery ' + time)
  }
  const both = run({ exactDeliveryRequested: true, exactDeliveryTime: '09:00', pickupType: 'exact', exactPickupTime: '22:30' })
  // 810 + 225 + 250 + 350 = 1635 taxable; 8.875% = 145.10625 -> 145.11
  assert.equal(both.taxAmount, 145.11)
  assert.equal(both.grandTotal, 1780.11)
})

behavior('order line names accept only a real color of that item', () => {
  const { checkoutLineName } = loadTs('lib/nycCheckoutPricing.ts')
  assert.equal(checkoutLineName('Spandex Chair Cover', ['White', 'Black'], 'Spandex Chair Cover (Black)'), 'Spandex Chair Cover (Black)')
  assert.equal(checkoutLineName('Spandex Chair Cover', ['White', 'Black'], 'Spandex Chair Cover (FREE)'), 'Spandex Chair Cover')
  assert.equal(checkoutLineName('Spandex Chair Cover', ['White'], 'Spandex Chair Cover - 50% off'), 'Spandex Chair Cover')
  assert.equal(checkoutLineName('Tent', [], 12), 'Tent')
})

test('orders are written under one lock with a period-wide stock and slot re-check', () => {
  const orders = read('app/api/orders/route.ts')
  assert.match(orders, /lockNycCapacity\(tx\)/)
  assert.match(orders, /findInventoryShortfalls\(tx, pricedTotals, period/)
  assert.match(orders, /exactSlotConflict\(tx,/)
  assert.match(orders, /checkoutLineName\(/)
  assert.doesNotMatch(orders, /reserveExactTimeSlot/)
  assert.doesNotMatch(orders, /startsWith\(line\.itemName\)/)
  // email-only customer linking; a phone match is only used for restriction checks
  assert.match(orders, /let customer = await prisma\.customer\.findFirst\(\{\s*where: \{ email: \{ equals: normalizedEmail, mode: 'insensitive' \} \}/)
  // a retry reuses the same unpaid order instead of colliding on checkoutDraftKey
  assert.match(orders, /order_already_placed/)
  assert.match(orders, /\['incomplete', 'quote'\]\.includes\(draftOrder\.status\)/)
  const inventory = read('lib/nycInventory.ts')
  assert.match(inventory, /pg_advisory_xact_lock/)
  assert.match(inventory, /eventEndDate: \{ gte: period\.start \}/, 'multi-day rentals block every day of the period')
  assert.match(inventory, /status: 'quote', checkoutLastSeenAt: \{ gte: cutoff \}/)
  const availability = read('lib/availability.ts')
  assert.match(availability, /activeOrdersCoveringDay/)
})

test('first online payment re-checks price, stock, slots and lead time', () => {
  const checkout = read('app/api/checkout/route.ts')
  assert.match(checkout, /firstOnlinePayment/)
  assert.match(checkout, /Prices in this saved checkout have changed/)
  assert.match(checkout, /findInventoryShortfalls\(tx, quantities, period, current\.id\)/)
  assert.match(checkout, /exactSlotConflict\(tx,/)
  assert.match(checkout, /24 \* 60 \* 60 \* 1000/)
  assert.doesNotMatch(checkout, /reserveExactTimeSlot/)
})

test('the public checkout draft never overwrites an existing customer record', () => {
  const draft = read('app/api/checkout/draft/route.ts')
  assert.doesNotMatch(draft, /data: \{ firstName, lastName, email, phone, address: eventAddress, city: eventCity, state: eventState, zip: eventZip \},\n\s*\}\)\n\s*: await prisma\.customer\.create/)
  assert.match(draft, /only fill in details that are still blank/)
  assert.match(draft, /items: \{ create: data\.items\.create \}/, 'a new draft is created with a valid nested create')
  assert.match(draft, /lockNycCapacity\(tx\)/)
})

test('cart colors are separate lines that share one stock count', () => {
  const cart = read('components/public/CartContext.tsx')
  assert.match(cart, /export function sameCartLine/)
  assert.match(cart, /export function cartQuantityForItem/)
  assert.match(cart, /removeItem: \(id: string, selectedColor\?: string\) => void/)
  const drawer = read('components/public/CartDrawer.tsx')
  assert.match(drawer, /removeItem\(item\.id, item\.selectedColor\)/)
  assert.match(drawer, /cartQuantityForItem\(items, item\.id\) >= item\.maxQuantity/)
  assert.match(read('components/public/ItemCard.tsx'), /cartQuantityForItem\(items,id\)/)
})

test('item photos are the Syracuse photos through the NYC proxy, including additional photos', () => {
  const route = read('app/api/item-image/[slug]/route.ts')
  assert.match(route, /searchParams\.get\('index'\)/)
  assert.match(route, /additionalImages/)
  assert.doesNotMatch(route, /NYC_ITEM_MEDIA|NYC_WEDDING_ITEM_TO_PACKAGE|sc-12x12/)
  const gallery = read('components/public/ItemGallery.tsx')
  assert.match(gallery, /\?index=\$\{index\}/)
  assert.doesNotMatch(gallery, /Reference preview/)
  const page = read('app/(public)/items/[...slug]/page.tsx')
  assert.match(page, /picture: addon\.picture \? nycItemImagePath\(addon\.slug\) : null/)
  assert.match(page, /itemDescriptionForNyc\(addon\.name, addon\.description, Number\(addon\.cost\)\)/)
})

test('customer-facing copy names only the NYC store', () => {
  const email = read('lib/email.ts')
  assert.doesNotMatch(email, /10% damage waiver|Our Warehouse|\$1 per chair|\$5 per chair/)
  assert.doesNotMatch(email, /fpr-nyc-production\.up\.railway\.app\/(?:contract|checkout)/)
  assert.match(email, /No damage waiver is offered or charged/)
  const lifecycle = read('lib/orderLifecycleNotifications.ts')
  assert.doesNotMatch(lifecycle, /- Friendly Party Rental`/)
  assert.doesNotMatch(lifecycle, /fpr-nyc-production\.up\.railway\.app/)
  assert.doesNotMatch(read('components/public/ReviewCarousel.tsx'), /friendlypartyrental\.com|Bonnie Brown/)
  assert.doesNotMatch(read('components/public/PlanningEstimator.tsx'), /13116/)
  assert.doesNotMatch(read('app/(public)/gallery/page.tsx'), /New York website/)
  assert.equal(fs.existsSync(path.join(root, 'public/images/badge-syracuse-number1-party-rental.png')), false)
  assert.match(read('lib/nycBrand.ts'), /NYC_EMAIL_LOGO_URL = 'https:\/\/friendlypartyrentalnyc\.com'/)
  assert.match(read('app/api/event-planning/route.ts'), /NYC_PRIMARY_ORIGIN/)
  const copy = read('lib/nycPublicCopy.ts')
  assert.match(copy, /localizeNycCatalogText/)
  assert.doesNotMatch(copy, /315\[-\.\\\\s\]/)
})

test('inherited South Carolina identity is reversed by a repeat-safe migration', () => {
  const sql = read('prisma/migrations/20260930190000_nyc_identity_copy_cleanup/migration.sql')
  assert.match(sql, /SET DEFAULT 'Friendly Party Rental NYC'/)
  assert.match(sql, /"ServiceArea" ALTER COLUMN "state" SET DEFAULT 'NY'/)
  assert.match(sql, /"location" = 'Riverdale, NY'/)
  assert.doesNotMatch(sql, /DELETE FROM|"Order"|"Customer"|"Payment"/)
})

test('"email me this quote" cannot relay arbitrary email or prices', () => {
  const route = read('app/api/send-quote/route.ts')
  assert.match(route, /prisma\.item\.findMany/, 'names and prices come from the NYC catalog')
  assert.doesNotMatch(route, /i\.price \* i\.quantity/)
  assert.match(route, /escapeHtml\(body\?\.customerName/)
  assert.match(route, /MAX_PER_IP/)
  assert.match(route, /\^\[\^\\s@,;<>\]\+@/)
  assert.match(read('app/api/admin/orders/[id]/send-quote/route.ts'), /catch \(sendError\)/)
  assert.match(read('app/api/admin/orders/[id]/send-cancellation/route.ts'), /catch \(sendError\)/)
  assert.match(read('lib/payments.ts'), /image:nycItemImage\(i\.item\)/)
})

behavior('public item URLs never show a Syracuse place suffix but still reach the mirrored slug', () => {
  const { nycItemUrlSlug, nycItemPath, nycItemImagePath, storedItemSlugCandidates, pickStoredItem } = loadTs('lib/nycItemPath.ts')
  const stored = 'graduation-party-package-small-seats-64-syracuse-ny'
  assert.equal(nycItemUrlSlug(stored), 'graduation-party-package-small-seats-64')
  assert.equal(nycItemPath(stored), '/items/graduation-party-package-small-seats-64')
  assert.equal(nycItemImagePath(stored), '/api/item-image/graduation-party-package-small-seats-64')
  assert.equal(nycItemImagePath('30-x-60-pole-tent', 0), '/api/item-image/30-x-60-pole-tent?index=0')
  assert.equal(nycItemPath('20x20-pole-tent'), '/items/20x20-pole-tent')
  assert.equal(nycItemUrlSlug('syracuse-ny'), 'syracuse-ny', 'a slug is never shortened to nothing')
  assert.deepEqual(storedItemSlugCandidates(stored), [stored], 'the full stored slug resolves only to itself')
  assert.equal(storedItemSlugCandidates('graduation-party-package-small-seats-64')[1], stored)
  const rows = [{ slug: stored, id: 'b' }, { slug: 'graduation-party-package-small-seats-64', id: 'a' }]
  assert.equal(pickStoredItem('graduation-party-package-small-seats-64', rows).id, 'a', 'an exact slug always wins')
  assert.equal(pickStoredItem('graduation-party-package-small-seats-64', rows.slice(0, 1)).id, 'b')
  assert.equal(pickStoredItem('missing', rows), null)
  const { rentalItemHref } = loadTs('lib/nycRentalSearch.ts')
  assert.equal(rentalItemHref({ slug: stored }), '/items/graduation-party-package-small-seats-64', 'header search links use the same short URL')
  assert.equal(rentalItemHref({ slug: '20x20-pole-tent' }), '/items/20x20-pole-tent')

  const page = read('app/(public)/items/[...slug]/page.tsx')
  assert.match(page, /storedItemSlugCandidates\(safeSegment\)/)
  assert.match(page, /permanentRedirect\(itemPath\)/)
  assert.doesNotMatch(page, /\/items\/\$\{item\.slug\}|\/api\/item-image\/\$\{item\.slug\}/)
  assert.match(read('app/api/item-image/[slug]/route.ts'), /pickStoredItem\(slug, rows\)/)
  for (const file of ['components/public/ItemCard.tsx', 'components/public/SuggestedAddons.tsx', 'components/public/MobileHome.tsx', 'components/public/DesktopHome.tsx', 'components/public/PopularRentalsShared.tsx', 'components/public/CategoryCatalogFallback.tsx', 'components/public/PlanningEstimator.tsx', 'app/sitemap.ts', 'lib/nycIndexNow.ts', 'app/(public)/weddings/page.tsx', 'app/(public)/weddings/layout.tsx']) {
    const source = read(file)
    assert.match(source, /nycItemPath\(/, file + ' links items through nycItemPath')
    assert.doesNotMatch(source, /['"`]\/items\/['"`]?\s*\+|`\/items\/\$\{/, file + ' builds no raw item URLs')
  }
})

test('multi-day pricing uses the Syracuse duration tiers without overwriting admin edits', () => {
  const sql = read('prisma/migrations/20260930210000_nyc_duration_tiers_from_syracuse/migration.sql')
  assert.match(sql, /WHERE NOT EXISTS \(SELECT 1 FROM "PricingTier"\)/, 'inserted only when NYC has no tiers')
  for (const row of ["'1 Day', 1, 1::integer, 0::double precision", "'2 Days', 2, 2, 60", "'7 Days (1 Week)', 7, 7, 200", "'2 Weeks', 8, 14, 400", "'29+ Days (Long-Term)', 29, NULL, 800"]) {
    assert.ok(sql.includes(row), row)
  }
  assert.doesNotMatch(sql, /DELETE|UPDATE "PricingTier"/)
})

behavior('a 2-day NYC rental adds the 60% duration tier to the rental subtotal only', () => {
  const { computeNycCheckoutPricing } = loadTs('lib/nycCheckoutPricing.ts')
  const tiers = [{ id: 'd1', label: '1 Day', minDays: 1, maxDays: 1, percent: 0 }, { id: 'd2', label: '2 Days', minDays: 2, maxDays: 2, percent: 60 }]
  const base = config({ tiers })
  const one = computeNycCheckoutPricing({ items: [{ id: 'tent', quantity: 1 }, { id: 'chair', quantity: 40 }], eventDate: '2026-11-20' }, base)
  const two = computeNycCheckoutPricing({ items: [{ id: 'tent', quantity: 1 }, { id: 'chair', quantity: 40 }], eventDate: '2026-11-20', durationTierId: 'd2' }, base)
  assert.equal(one.durationFee, 0)
  assert.equal(one.rentalDays, 1)
  assert.equal(two.durationFee, Math.round(one.cartSubtotal * 60) / 100)
  assert.equal(two.rentalDays, 2)
  assert.equal(two.durationLabel, '2 Days')
  assert.equal(two.deliveryFee, one.deliveryFee, 'delivery is not multiplied by the rental length')
})
