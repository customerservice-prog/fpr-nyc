// NYC checkout pricing configuration: per-jurisdiction sales tax, the
// owner-approved checkout policy, and the storefront pages that display them.
// Static checks run everywhere; behavioral checks transpile the pure TypeScript
// modules with the project's `typescript` dev dependency (no database or network).
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

function serviceAreaZips() {
  const source = read('lib/nycServiceAreas.ts')
  return Array.from(new Set(Array.from(source.matchAll(/'(\d{5})'/g), match => match[1]))).sort()
}

// ---------------------------------------------------------------------------
// Sales tax
// ---------------------------------------------------------------------------

behavior('sales tax: every approved delivery ZIP has a jurisdiction, and only those ZIPs', () => {
  const tax = loadTs('lib/nycSalesTax.ts')
  assert.deepEqual(Object.keys(tax.NYC_ZIP_TAX_JURISDICTIONS).sort(), serviceAreaZips())
  for (const zip of serviceAreaZips()) assert.notEqual(tax.resolveNycSalesTax(zip).status, 'unknown_zip', zip)
})

behavior('sales tax: rates and reporting codes match NYS Publication 718 (2/25)', () => {
  const tax = loadTs('lib/nycSalesTax.ts')
  const byId = tax.NYC_SALES_TAX_JURISDICTIONS
  assert.deepEqual([byId['new-york-city'].ratePercent, byId['new-york-city'].reportingCode], [8.875, '8081'])
  assert.deepEqual([byId.yonkers.ratePercent, byId.yonkers.reportingCode], [8.875, '6511'])
  assert.deepEqual([byId['mount-vernon'].ratePercent, byId['mount-vernon'].reportingCode], [8.375, '5521'])
  assert.deepEqual([byId['new-rochelle'].ratePercent, byId['new-rochelle'].reportingCode], [8.375, '6861'])
  assert.deepEqual([byId['westchester-outside-cities'].ratePercent, byId['westchester-outside-cities'].reportingCode], [8.375, '5581'])
  assert.equal(tax.NYC_SALES_TAX_SOURCE.publication, 'NYS Publication 718 (2/25)')
  assert.equal(tax.NYC_SALES_TAX_SOURCE.effectiveDate, '2025-03-01')
})

behavior('sales tax: Bronx and Westchester ZIPs resolve to their own jurisdictions, never one shared rate', () => {
  const tax = loadTs('lib/nycSalesTax.ts')
  const rate = zip => tax.resolveNycSalesTax(zip)
  for (const zip of ['10463', '10468', '10470', '10471']) assert.equal(rate(zip).jurisdiction.id, 'new-york-city', zip)
  for (const zip of ['10701', '10703', '10704', '10705', '10710']) assert.equal(rate(zip).jurisdiction.id, 'yonkers', zip)
  for (const zip of ['10550', '10552', '10553']) assert.equal(rate(zip).jurisdiction.id, 'mount-vernon', zip)
  for (const zip of ['10801', '10804', '10805']) assert.equal(rate(zip).jurisdiction.id, 'new-rochelle', zip)
  for (const zip of ['10709', '10803']) assert.equal(rate(zip).jurisdiction.id, 'westchester-outside-cities', zip)
  assert.equal(rate('10550').ratePercent, 8.375)
  assert.equal(rate('10471').ratePercent, 8.875)
  assert.equal(rate('10471-2201').zip, '10471')
})

behavior('sales tax: ZIPs shared with the City of Yonkers are held for address review; unknown ZIPs are not guessed', () => {
  const tax = loadTs('lib/nycSalesTax.ts')
  for (const zip of ['10707', '10708']) {
    const result = tax.resolveNycSalesTax(zip)
    assert.equal(result.status, 'needs_address_review', zip)
    assert.deepEqual(result.candidates.map(c => c.id).sort(), ['westchester-outside-cities', 'yonkers'])
    assert.match(tax.salesTaxUnavailableMessage(result, '315-884-1498'), /Yonkers/)
  }
  for (const value of ['10001', '13212', '29601', '', null, 'abcde', '1047']) {
    assert.equal(tax.resolveNycSalesTax(value).status, 'unknown_zip', String(value))
  }
  assert.equal(tax.formatTaxRatePercent(8.875), '8.875%')
  assert.equal(tax.formatTaxRatePercent(8.375), '8.375%')
  assert.equal(tax.formatTaxRatePercent(10), '10%')
})

// ---------------------------------------------------------------------------
// Owner-approved checkout policy
// ---------------------------------------------------------------------------

behavior('policy: missing, malformed, misspelled or out-of-range values block checkout', () => {
  const { parseNycCheckoutPolicy } = loadTs('lib/nycCheckoutPolicy.ts')
  const error = raw => parseNycCheckoutPolicy(raw).error
  assert.equal(error(undefined), 'policy_missing')
  assert.equal(error(''), 'policy_missing')
  assert.equal(error('{'), 'policy_not_json')
  assert.equal(error('[]'), 'policy_not_object')
  assert.equal(error('{}'), 'policy_minimum_invalid', 'the minimum order must be chosen explicitly')
  assert.equal(error('{"minimumOrderSubtotal":-1}'), 'policy_minimum_invalid')
  assert.equal(error('{"minimumOrderSubtotal":"100"}'), 'policy_minimum_invalid')
  assert.match(error('{"minimumOrderSubtotal":100,"exactDeliveryfee":50}'), /^policy_unknown_key/)
  assert.equal(error('{"minimumOrderSubtotal":100,"lastMinuteFee":49.999}'), 'policy_lastMinuteFee_invalid')
  assert.equal(error('{"minimumOrderSubtotal":100,"damageWaiverPercent":0}'), 'policy_damage_waiver_invalid')
  assert.equal(error('{"minimumOrderSubtotal":100,"damageWaiverPercent":150}'), 'policy_damage_waiver_invalid')
  assert.equal(error('{"minimumOrderSubtotal":100,"lateExactPickupFee":75}'), 'policy_late_pickup_without_exact_pickup')
  assert.equal(error('{"minimumOrderSubtotal":100,"approvedOn":"yesterday"}'), 'policy_approved_on_invalid')
  for (const bad of ['{', '{}', '{"minimumOrderSubtotal":100,"x":1}']) assert.equal(parseNycCheckoutPolicy(bad).policy, null)
})

behavior('policy: optional fees default to "not offered" and approved values are kept exactly', () => {
  const policyModule = loadTs('lib/nycCheckoutPolicy.ts')
  const minimal = policyModule.parseNycCheckoutPolicy('{"minimumOrderSubtotal":500}')
  assert.equal(minimal.error, null)
  assert.deepEqual(minimal.policy, { minimumOrderSubtotal: 500, damageWaiverPercent: null, lastMinuteFee: null, exactDeliveryFee: null, exactPickupFee: null, lateExactPickupFee: null, approvedOn: null })
  const full = policyModule.parseNycCheckoutPolicy(JSON.stringify({ minimumOrderSubtotal: 0, damageWaiverPercent: 12.5, lastMinuteFee: 49.99, exactDeliveryFee: 85, exactPickupFee: 60, lateExactPickupFee: 90, approvedOn: '2026-10-01' })).policy
  assert.equal(full.minimumOrderSubtotal, 0)
  assert.equal(full.damageWaiverPercent, 12.5)
  assert.equal(full.lastMinuteFee, 49.99)
  assert.equal(policyModule.exactPickupFeeForPolicy(full, '19:00'), 60)
  assert.equal(policyModule.exactPickupFeeForPolicy(full, '22:00'), 90)
  assert.equal(policyModule.exactPickupFeeForPolicy(full, '23:30'), 90)
  assert.equal(policyModule.exactPickupFeeForPolicy(full, 'bad'), null)
  assert.equal(policyModule.exactPickupFeeForPolicy({ ...full, lateExactPickupFee: null }, '22:30'), null)
  assert.equal(policyModule.exactPickupFeeForPolicy(minimal.policy, '19:00'), null)
  const view = policyModule.publicCheckoutPolicy(minimal)
  assert.equal(view.configured, true)
  assert.equal(view.minimumLeadHours, 24)
  assert.equal(view.lastMinuteWindowHours, 72)
  assert.equal(policyModule.publicCheckoutPolicy(policyModule.parseNycCheckoutPolicy(undefined)).configured, false)
})

// ---------------------------------------------------------------------------
// What customers see
// ---------------------------------------------------------------------------

test('payment page shows the server quote and never recomputes prices itself', () => {
  const page = read('app/(public)/checkout/payment/page.tsx')
  assert.match(page, /fetch\('\/api\/checkout\/quote'/)
  assert.match(page, /onlineCheckoutAvailable === true/)
  assert.doesNotMatch(page, /49\.99|0\.10\b|\* 0\.1\b|minimumOrder = 100/, 'no inherited fee constants on the payment page')
  assert.doesNotMatch(page, /fetchJson\('\/api\/tax-rate'\)/, 'the page does not use a single store-wide tax rate')
  assert.doesNotMatch(page, /taxableBase|Math\.round\(grandTotal \* \(depositPct/, 'no client-side tax or deposit arithmetic')
  const quote = read('app/api/checkout/quote/route.ts')
  assert.match(quote, /priceNycCheckout\(body\)/)
  assert.doesNotMatch(quote, /prisma\.(order|customer)\.(create|update|upsert)/, 'a quote never writes orders or customers')
  assert.doesNotMatch(quote, /requireNycStripe|sendEmail/)
})

test('storefront offers optional fees only from the approved policy', () => {
  for (const file of ['app/(public)/checkout/page.tsx', 'app/(public)/category/[slug]/CategoryClient.tsx']) {
    const code = read(file)
    assert.match(code, /useCheckoutPolicy\(\)/, file)
    assert.doesNotMatch(code, /EXACT_DELIVERY_FEE\s*=|function getExactPickupFee|return 75\b|return 50\b/, file + ' hard-codes an exact-time fee')
    assert.doesNotMatch(code, /\$\{'\$'\}\{/, file + ' has a broken className template')
  }
  const checkout = read('app/(public)/checkout/page.tsx')
  assert.match(checkout, /damageWaiverPercent !== null && <div/)
  assert.doesNotMatch(checkout, /Damage Waiver \(10% of subtotal\)/)
  const server = read('lib/nycCheckoutPricingServer.ts')
  assert.match(server, /policy: getNycCheckoutPolicy\(\)\.policy/)
  assert.match(server, /salesTax: resolveNycSalesTax\(quote\.zip\)/)
  assert.doesNotMatch(server, /taxRatePercent/)
})

test('payment readiness separates Stripe readiness from approved checkout pricing', () => {
  const status = read('app/api/payments/status/route.ts')
  assert.match(status, /checkoutPolicyConfigured: getNycCheckoutPolicy\(\)\.policy !== null/)
  assert.match(status, /deliveryFeesConfigured:/)
  assert.match(status, /const onlineCheckoutAvailable = Object\.values\(checks\)\.every\(Boolean\)/)
  assert.doesNotMatch(status, /JSON\.stringify\(process\.env|NYC_CHECKOUT_POLICY_JSON|NYC_DELIVERY_FEES_JSON/, 'no configuration values are returned')
})

test('customer-facing tax labels keep eighth-of-a-percent rates', () => {
  assert.doesNotMatch(read('app/(contract)/contract/[id]/page.tsx'), /Math\.round\(order\.taxRate\)/)
  assert.doesNotMatch(read('lib/email.ts'), /Math\.round\(fees\.taxRate\)/)
  assert.doesNotMatch(read('app/api/admin/virtual-assistant/quote/route.ts'), /\?\? 8\b/, 'no guessed 8% tax in staff quotes')
})

test('NYC emails and the chat assistant carry NYC identity and approved prices only', () => {
  const email = read('lib/email.ts')
  assert.doesNotMatch(email, /SOUTH CAROLINA|GREENVILLE|greenville-sc/)
  assert.match(email, /'X-FPR-Location': 'nyc-downstate'/)
  const chat = read('app/api/chat-assistant/route.ts')
  for (const inherited of [/Greer|Simpsonville|Mauldin|Easley|Travelers Rest|Spartanburg|Anderson|Piedmont/, /\$199|\$125|\$100 fee|\$49\.99/, /10% damage waiver applies/, /in-store pickup/, /\?\? (75|40|100)\)/]) {
    assert.doesNotMatch(chat, inherited)
  }
  // The static FAQ must not promise a damage waiver: whether one is offered comes from the approved policy.
  assert.doesNotMatch(chat, /covered by the damage waiver/)
  assert.match(chat, /getNycCheckoutPolicy\(\)\.policy/)
  assert.match(chat, /NYC_SALES_TAX_JURISDICTIONS/)
})

test('online orders record the sales tax jurisdiction for the NYS return', () => {
  const orders = read('app/api/orders/route.ts')
  assert.match(orders, /pricing\.taxJurisdiction\.reportingCode/)
})

test('server-priced online orders are never re-priced by the simplified quote self-edit', () => {
  const route = read('app/api/orders/[id]/items/route.ts')
  const guard = route.indexOf("if (order.source === 'online')")
  assert.ok(guard > 0, 'online orders are refused')
  assert.ok(guard < route.indexOf('prisma.$transaction'), 'the refusal happens before any write')
})

// ---------------------------------------------------------------------------
// Storefront: no South Carolina residue and no unapproved inherited prices
// ---------------------------------------------------------------------------

const SC_PLACES = /Greenville|\bGreer\b|Simpsonville|Mauldin|Easley|Travelers Rest|Spartanburg|\bAnderson\b|Piedmont|Taylors|Fountain Inn|South Carolina|, SC\b|\bSC<\/strong>/
const SC_PHONE_OR_ZIP = /\(?864\)?[-. ]?\d{3}[-. ]?\d{4}|\b29[0-9]{3}\b/
const CUSTOMER_FACING = [
  'app/(public)/category/[slug]/CategoryClient.tsx',
  'app/not-found.tsx',
  'app/(public)/not-found.tsx',
  'app/(public)/chiavari-chair-rentals/page.tsx',
  'app/(public)/graduation-rentals/page.tsx',
  'app/(public)/wedding-vendors/page.tsx',
  'app/(public)/weddings/page.tsx',
  'app/(public)/wedding-packages/page.tsx',
  'app/(public)/category/layout.tsx',
  'app/(public)/order-by-date/layout.tsx',
  'app/(public)/[slug]/page.tsx',
  'app/(public)/service-area/page.tsx',
  'app/api/wedding-packages/route.ts',
  'app/api/employment/route.ts',
  'app/api/admin/generate-item-descriptions/route.ts',
  'app/admin/website/page.tsx',
  'components/public/ChatWidget.tsx',
  'components/public/ServiceAreaDirectory.tsx',
  'components/public/DeliveryFeeChecker.tsx',
  'components/public/PlanningPage.tsx',
  'components/public/HomeWeddingBanner.tsx',
  'components/public/DesignYourEventCTA.tsx',
  'components/public/ReviewCarousel.tsx',
  'lib/eventPlanning.ts',
  'lib/planningInquiry.ts',
]

test('customer-facing NYC pages, emails and tools name no South Carolina places, phone numbers or ZIP codes', () => {
  for (const file of CUSTOMER_FACING) {
    const source = read(file).replace(/^\s*(\/\/|\*|\/\*).*$/gm, '')
    assert.doesNotMatch(source, SC_PLACES, file)
    assert.doesNotMatch(source, SC_PHONE_OR_ZIP, file)
  }
  assert.match(read('lib/planningInquiry.ts'), /\[NYC EVENT PLANNING INQUIRY\]/)
  assert.match(read('app/api/employment/route.ts'), /'NYC employment application - '/)
})

test('the shared delivery-area summary names every approved NYC service area', () => {
  const source = read('lib/nycServiceAreas.ts')
  const summary = /NYC_SERVICE_AREA_SUMMARY='([^']+)'/.exec(source)
  assert.ok(summary, 'NYC_SERVICE_AREA_SUMMARY is defined')
  const names = Array.from(source.matchAll(/\{name:'([^']+)'/g), match => match[1]).filter(name => name !== 'The Bronx')
  assert.ok(names.length >= 10)
  for (const name of names) assert.ok(summary[1].includes(name), name)
  assert.match(summary[1], /Bronx/)
  for (const file of ['app/(public)/category/[slug]/CategoryClient.tsx', 'components/public/ChatWidget.tsx', 'components/public/PlanningPage.tsx', 'lib/eventPlanning.ts']) {
    assert.match(read(file), /NYC_SERVICE_AREA_SUMMARY/, file)
  }
})

test('checkout shows the approved minimum order before payment (the server still enforces it)', () => {
  const checkout = read('app/(public)/checkout/page.tsx')
  assert.match(checkout, /const minimumOrderSubtotal = approvedPolicy\?\.minimumOrderSubtotal \?\? 0/)
  assert.match(checkout, /\{belowMinimum && \(/)
  assert.match(read('lib/nycCheckoutPricing.ts'), /'below_minimum'/)
})

test('online and staff orders default the event state to New York', () => {
  const checkout = read('app/(public)/checkout/page.tsx')
  assert.match(checkout, /register\('eventState'[^\n]*defaultValue="NY"/)
  assert.doesNotMatch(checkout, /defaultValue="SC"/)
  assert.match(read('app/api/admin/orders/route.ts'), /eventState: body\.eventState \|\| 'NY'/)
  const staff = read('app/admin/orders/new/page.tsx')
  assert.doesNotMatch(staff, /<option value="SC">/)
  assert.equal((staff.match(/<option value="NY">NY<\/option>/g) || []).length, 2)
})

test('the chat widget fallback quotes no inherited prices, deposit or multi-day formula', () => {
  const widget = read('components/public/ChatWidget.tsx')
  const faq = widget.slice(widget.indexOf('const FAQ_DATA'), widget.indexOf('const QUICK_QUESTIONS'))
  assert.ok(faq.length > 1000)
  assert.doesNotMatch(faq, /\\?\$\d/)
  assert.doesNotMatch(faq, /\d+%/)
  assert.match(widget, /item\.cost <= 0\) return null/)
})

test('static rental pages publish no inherited prices', () => {
  for (const file of ['app/(public)/chiavari-chair-rentals/page.tsx', 'app/(public)/graduation-rentals/page.tsx', 'app/(public)/wedding-vendors/page.tsx']) {
    assert.doesNotMatch(read(file), /\$\d/, file)
  }
  // Finishes are listed without prices; the approved catalog item page shows the price for the event date.
  assert.match(read('app/(public)/chiavari-chair-rentals/page.tsx'), /Price and availability are shown for your event date/)
})

test('wedding package prices come only from the published, priced NYC catalog item', () => {
  const lib = read('lib/wedding-packages.ts')
  assert.match(lib, /price: approvedPrice \?\? null/)
  assert.doesNotMatch(lib, /: p\.price|fallback\?\.price|liveCost/)
  assert.match(lib, /item\.displayToCustomer && item\.status === 'Available' && Number\.isFinite\(cost\) && cost > 0/)
  assert.match(read('components/public/WeddingPackageCard.tsx'), /price: number \| null/)
  assert.match(read('components/public/WeddingPackageCard.tsx'), /'Price on request'/)
  const detail = read('app/(public)/wedding-packages/page.tsx')
  assert.doesNotMatch(detail, /formatCurrency\((pkg|p)\.price\)\}/)
  assert.equal((detail.match(/'Price on request'/g) || []).length, 2)
  for (const file of ['app/(public)/wedding-packages/page.tsx', 'app/(public)/weddings/page.tsx']) {
    assert.doesNotMatch(read(file), /travel fee may apply based on distance/i, file)
  }
  assert.match(read('app/(public)/weddings/page.tsx'), /displayToCustomer: true, picture: \{ not: null \}, cost: \{ gt: 0 \}/)
})

test('planning packages show no unapproved prices', () => {
  const planning = read('lib/eventPlanning.ts')
  assert.match(planning, /export const PLANNING_PRICES_APPROVED: boolean = false/)
  const packages = read('components/public/PlanningPackages.tsx')
  assert.match(packages, /planningPackagePriceLabel\(pkg\)/)
  assert.match(packages, /planningPackageItems\(pkg\)/)
  assert.doesNotMatch(packages, /\{pkg\.price\}|\$85/)
  const estimator = read('components/public/PlanningEstimator.tsx')
  assert.match(estimator, /pkg\.amount !== null \? <>\{money\(pkg\.amount\)\}/)
  assert.match(estimator, /estimate\.planningPriced \? money\(estimate\.planningCents \/ 100\)/)
  // An estimate with nothing priced yet shows "To be quoted", never a $0.00 total.
  assert.match(estimator, /estimate\.subtotalCents > 0 \? money\(estimate\.subtotalCents \/ 100\) : 'To be quoted'/)
  assert.match(estimator, /estimate\.subtotalCents > 0 \? money\(estimate\.perGuest\) : 'To be quoted'/)
})

behavior('planning estimator leaves unapproved planning prices out of every total', () => {
  const planning = loadTs('lib/eventPlanning.ts')
  const estimator = loadTs('lib/planningEstimator.ts')
  assert.equal(planning.PLANNING_PRICES_APPROVED, false)
  assert.equal(estimator.EXTRA_PLANNING_RATE, null)
  for (const pkg of estimator.estimatePackages) {
    assert.equal(pkg.amount, null, pkg.name)
    assert.ok(!pkg.items.some(item => /\$/.test(item)), pkg.name)
    assert.equal(planning.planningPackagePriceLabel(pkg), 'Quoted individually')
  }
  const details = { ...estimator.initialEstimate('Wedding'), packageNumber: 3, onsiteHours: 14, extraPrepHours: 2, zip: '10471' }
  const item = { id: 'chair', name: 'Chair', slug: 'chair', cost: 4, category: 'Chairs', categorySlug: 'chairs', image: '', available: null }
  const result = estimator.calculateEstimate(details, [item], { chair: 10 }, 75)
  assert.equal(result.planningPriced, false)
  assert.equal(result.planningCents, 0)
  assert.equal(result.extraCents, 0)
  assert.equal(result.custom, true)
  assert.equal(result.subtotalCents, 4000 + 7500)
  const summary = estimator.estimateInquiry(details, result).summary
  assert.match(summary, /Published planning base: Quote required\. Additional planning time: Quote required\./)
  assert.doesNotMatch(summary, /\$1,|\$2,|\$3,|\$5,|\$85/)
  for (const faq of planning.planningFaqs) assert.doesNotMatch(faq.answer, /\$\d/, faq.question)
})
