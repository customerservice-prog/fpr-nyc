const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const test = require('node:test')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const NY_GA = 'G-NV8CF7GT5C'
const NY_ADS = 'AW-18374628389'
const NY_LABEL = 'ig-ZCL_Q1d0cEKWo2rlE'
// Synthetic destinations exist only inside these offline stub tests.
const SC_GA = 'G-SCTEST123'
const SC_ADS = 'AW-123456789'
const SC_LABEL = 'sc_test_purchase'
function load(file, imports = {}, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const context = vm.createContext({ exports: {}, ...globals, require(name) {
    if (name in imports) return imports[name]
    throw new Error(`Unexpected import: ${name}`)
  } })
  vm.runInContext(code, context)
  return context.exports
}
function tracker(env = {}, browser = true) {
  const calls = []
  const window = { gtag: (...args) => calls.push(args) }
  const tracking = load('lib/gtag.ts', {}, { process: { env }, ...(browser ? { window } : {}) })
  return { tracking, calls, window }
}
const configured = {
  NEXT_PUBLIC_SC_GA_MEASUREMENT_ID: SC_GA,
  NEXT_PUBLIC_SC_GOOGLE_ADS_ID: SC_ADS,
  NEXT_PUBLIC_SC_GOOGLE_ADS_PURCHASE_LABEL: SC_LABEL,
}

test('SC is off by default even when an unrelated gtag already exists', () => {
  const { tracking, calls } = tracker()
  assert.equal(tracking.GA_MEASUREMENT_ID, '')
  assert.equal(tracking.AW_CONVERSION_ID, '')
  assert.equal(tracking.GOOGLE_TAG_ID, '')
  assert.equal(tracking.GOOGLE_TAG_BOOTSTRAP, '')
  assert.equal(tracking.AW_PURCHASE_DESTINATION, '')
  tracking.trackEvent('purchase', { transaction_id: 'offline-stub' })
  tracking.trackEvent('conversion', { send_to: `${NY_ADS}/${NY_LABEL}` })
  tracking.trackEvent('contact')
  assert.deepEqual(calls, [])
})

test('copied New York IDs and purchase label are rejected even if explicitly configured', () => {
  const { tracking, calls } = tracker({
    NEXT_PUBLIC_SC_GA_MEASUREMENT_ID: ` ${NY_GA} `,
    NEXT_PUBLIC_SC_GOOGLE_ADS_ID: NY_ADS,
    NEXT_PUBLIC_SC_GOOGLE_ADS_PURCHASE_LABEL: NY_LABEL,
  })
  assert.equal(tracking.GOOGLE_TAG_ID, '')
  assert.equal(tracking.GOOGLE_TAG_BOOTSTRAP, '')
  assert.equal(tracking.AW_PURCHASE_DESTINATION, '')
  tracking.trackEvent('purchase')
  tracking.trackEvent('conversion')
  assert.deepEqual(calls, [])
})

test('malformed IDs and script-injection text cannot enter a Google bootstrap', () => {
  const { tracking } = tracker({
    NEXT_PUBLIC_SC_GA_MEASUREMENT_ID: "G-INVALID';alert(1)//",
    NEXT_PUBLIC_SC_GOOGLE_ADS_ID: 'AW-not-a-number',
    NEXT_PUBLIC_SC_GOOGLE_ADS_PURCHASE_LABEL: '</script>',
  })
  assert.equal(tracking.GOOGLE_TAG_BOOTSTRAP, '')
  assert.equal(tracking.AW_PURCHASE_DESTINATION, '')
})

test('separate SC config initializes only its configured destinations and rejects a NY send_to', () => {
  const { tracking, calls, window } = tracker(configured)
  vm.runInNewContext(tracking.GOOGLE_TAG_BOOTSTRAP, { window })
  assert.deepEqual(calls.filter(call => call[0] === 'config'), [['config', SC_GA], ['config', SC_ADS]])
  tracking.trackEvent('purchase', { value: 10, currency: 'USD', transaction_id: 'offline-stub' })
  tracking.trackEvent('conversion', { send_to: `${SC_ADS}/${SC_LABEL}` })
  const before = calls.length
  tracking.trackEvent('conversion', { send_to: `${NY_ADS}/${NY_LABEL}` })
  tracking.trackEvent('purchase', { send_to: NY_GA })
  assert.equal(calls.length, before)
  assert.equal(calls.find(call => call[1] === 'purchase')[2].send_to, SC_GA)
  assert.equal(calls.find(call => call[1] === 'conversion')[2].send_to, `${SC_ADS}/${SC_LABEL}`)
})

test('GA-only configuration cannot emit Ads conversions; Ads-only cannot default-route GA purchases', () => {
  const ga = tracker({ NEXT_PUBLIC_SC_GA_MEASUREMENT_ID: SC_GA })
  ga.tracking.trackEvent('purchase')
  ga.tracking.trackEvent('conversion')
  assert.equal(ga.calls.length, 1)
  assert.equal(ga.calls[0][1], 'purchase')
  const ads = tracker({ NEXT_PUBLIC_SC_GOOGLE_ADS_ID: SC_ADS, NEXT_PUBLIC_SC_GOOGLE_ADS_PURCHASE_LABEL: SC_LABEL })
  ads.tracking.trackEvent('purchase')
  ads.tracking.trackEvent('conversion')
  assert.equal(ads.calls.length, 1)
  assert.equal(ads.calls[0][1], 'conversion')
})

test('a separate Ads ID without a separate valid purchase label cannot use the copied NY action', () => {
  for (const label of ['', NY_LABEL, 'invalid label']) {
    const { tracking, calls } = tracker({ NEXT_PUBLIC_SC_GOOGLE_ADS_ID: SC_ADS, NEXT_PUBLIC_SC_GOOGLE_ADS_PURCHASE_LABEL: label })
    assert.equal(tracking.AW_PURCHASE_DESTINATION, '')
    tracking.trackEvent('conversion')
    assert.deepEqual(calls, [])
  }
})

const jsx = (type, props) => ({ type, props })
function layout(tracking) {
  return load('app/layout.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    'next/font/google': { Roboto: () => ({ className: 'font-stub' }) },
    'react-hot-toast': { Toaster: 'Toaster' },
    'next/script': { default: 'Script' },
    '@/components/public/CartContext': { CartProvider: 'CartProvider' },
    '@/components/GoogleAnalyticsListener': { default: 'GoogleAnalyticsListener' },
    '@/components/VisitorTracker': { default: 'VisitorTracker' },
    '@/lib/gtag': tracking,
    '@/lib/jsonLd': { safeJsonLd: value => JSON.stringify(value) },
    './globals.css': {},
  }, { process: { env: {} }, URL }).default({ children: 'Checkout remains available' })
}

test('unconfigured SC renders no Google remote/init scripts while retaining checkout and local visitor tracker', () => {
  const rendered = JSON.stringify(layout(tracker().tracking))
  assert.doesNotMatch(rendered, /googletagmanager|ga4-init|AW-18374628389|G-NV8CF7GT5C/)
  assert.match(rendered, /Checkout remains available/)
  assert.match(rendered, /VisitorTracker/)
  const configuredRender = JSON.stringify(layout(tracker(configured).tracking))
  assert.match(configuredRender, /googletagmanager/)
  assert.match(configuredRender, /G-SCTEST123/)
  assert.doesNotMatch(configuredRender, /AW-18374628389|G-NV8CF7GT5C/)
})

test('route listener does not send a blank or default GA config when SC analytics is off', () => {
  for (const id of ['', SC_GA]) {
    const effects = [], calls = []
    const component = load('components/GoogleAnalyticsListener.tsx', {
      'react': { useEffect: effect => effects.push(effect), useRef: value => ({ current: value }) },
      'next/navigation': { usePathname: () => '/category/tent-rentals' },
      '@/lib/gtag': { GA_MEASUREMENT_ID: id },
    }, { window: { gtag: (...args) => calls.push(args) } }).default
    component()
    effects.forEach(effect => effect())
    assert.equal(calls.length, 0)
  }
})

test('confirmation requires a server-verified receipt and does not fire Google events itself', async () => {
  const { calls } = tracker()
  const effects = [], states = [], requests = []
  let index = 0
  const verified = { paymentId:'pay-1',orderId:'offline-stub',orderNumber:'SC-STUB',amountPaid:25,totalPaid:25,totalAmount:100,balanceDue:75,currency:'USD',status:'succeeded',paidAt:'2026-09-22T12:00:00Z',purchaseEligible:true }
  const component = load('app/(public)/checkout/confirmation/page.tsx', {
    'react': { useEffect: effect => effects.push(effect), useState: initial => {
      const current = index++
      if (!(current in states)) states[current] = initial
      return [states[current], value => { states[current] = value }]
    } },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/link': { default: 'Link' },
    '@/components/public/PaymentReceiptSummary': { default: 'PaymentReceiptSummary' },
  }, {
    sessionStorage: { getItem: () => JSON.stringify({ orderId: 'offline-stub', stripePaymentId: 'pi_live_stub', totalAmount: 999999 }) },
    fetch: async (url, options) => { requests.push({ url, options }); return { ok:true, json:async()=>({ receipt:verified }) } },
  }).default
  component()
  effects.splice(0).forEach(effect => effect())
  await new Promise(resolve => setImmediate(resolve))
  index = 0
  const rendered = JSON.stringify(component())
  assert.match(rendered, /Thank You!/)
  assert.match(rendered, /PaymentReceiptSummary/)
  assert.equal(states[0].amountPaid, 25)
  assert.equal(requests.length, 1)
  assert.deepEqual(JSON.parse(requests[0].options.body), { stripePaymentId:'pi_live_stub' })
  assert.doesNotMatch(rendered, /999999/)
  assert.deepEqual(calls, [])
})

test('server rendering never emits browser events even when SC destinations are configured', () => {
  const { tracking, calls } = tracker(configured, false)
  assert.doesNotThrow(() => tracking.trackEvent('purchase'))
  assert.deepEqual(calls, [])
})


test('SC events queue before the remote tag loads and transaction events dedupe', () => {
  const browserWindow = {}
  const tracking = load('lib/gtag.ts', {}, { process: { env: configured }, window: browserWindow })
  tracking.trackEvent('begin_checkout', { value: 100, currency: 'USD' })
  tracking.trackEvent('purchase', { transaction_id: 'SC-100', value: 100, currency: 'USD' })
  tracking.trackEvent('purchase', { transaction_id: 'SC-100', value: 100, currency: 'USD' })
  tracking.trackEvent('conversion', { transaction_id: 'SC-100', send_to: SC_ADS + '/' + SC_LABEL })
  tracking.trackEvent('conversion', { transaction_id: 'SC-100', send_to: SC_ADS + '/' + SC_LABEL })
  const commands = Array.from(browserWindow.dataLayer || [], entry => Array.from(entry))
  assert.equal(commands.length, 3)
  assert.deepEqual(commands.map(entry => entry[1]), ['begin_checkout', 'purchase', 'conversion'])
  assert.equal(commands[0][2].send_to, SC_GA)
  assert.equal(commands[2][2].send_to, SC_ADS + '/' + SC_LABEL)
})

test('SC layout initializes its queue before hydration and keeps Google network loading lazy', () => {
  const source = fs.readFileSync(path.join(root, 'app/layout.tsx'), 'utf8')
  assert.match(source, /<Script id="ga4-init" strategy="beforeInteractive">/)
  assert.match(source, /strategy="lazyOnload"/)
  assert.doesNotMatch(source, /G-NV8CF7GT5C|AW-18374628389/)
})


test('SC global response headers add browser protections without losing private noindex rules', () => {
  const source = fs.readFileSync(path.join(root, 'next.config.js'), 'utf8')
  for (const header of ['Content-Security-Policy','Strict-Transport-Security','X-Content-Type-Options','Referrer-Policy','X-Frame-Options','Cross-Origin-Opener-Policy']) assert.match(source, new RegExp(header))
  assert.match(source, /form-action 'self' https:\/\/www\.friendlypartyrentalsc\.com https:\/\/friendlypartyrentalsc\.com/)
  assert.doesNotMatch(source, /form-action[^\n]*friendlypartyrental\.com(?:\s|')/)
  assert.match(source, /X-Robots-Tag/)
  assert.match(source, /\/checkout\/:path\*/)
})

test('SC quick demo conversion handoff stays localized and does not sell unavailable designer access', () => {
  const source = fs.readFileSync(path.join(root, 'components/public/EventDesignVideo.tsx'), 'utf8')
  assert.match(source, /rentsketch_demo_started/)
  assert.match(source, /rentsketch_demo_completed/)
  assert.match(source, /rentsketch_demo_cta_click/)
  assert.match(source, /Get Greenville Layout Help/)
  assert.match(source, /Check My Event Date/)
  assert.match(source, /Online Greenville RentSketch designer access is not active yet/)
  assert.doesNotMatch(source, /rentSketchPurchaseUrl|EVENT_PASS_PRICE|Build my event/)
})


test('verified payment receipt uses Stripe collected value and committed ledger evidence', () => {
  const mod = load('lib/paymentReceipt.ts')
  const payment = { id:'pay-1', orderId:'order-1', stripePaymentId:'pi_1', status:'succeeded', amount:125, createdAt:new Date('2026-09-22T12:00:00Z') }
  const order = { id:'order-1', orderNumber:'SC-TEST', status:'active', amountPaid:125, totalAmount:500, balanceDue:375, payments:[payment] }
  const intent = { id:'pi_1', status:'succeeded', currency:'usd', amount_received:12500, livemode:true, metadata:{orderId:'order-1'} }
  const receipt = mod.buildPaymentReceipt(intent, order)
  assert.equal(receipt.amountPaid,125)
  assert.equal(receipt.totalAmount,500)
  assert.equal(receipt.purchaseEligible,true)
  assert.equal(mod.buildPaymentReceipt({...intent,amount_received:0},order),null)
  assert.equal(mod.buildPaymentReceipt({...intent,metadata:{orderId:'other'}},order),null)
})

test('SC paid-booking tracking uses actual collected value and only the SC Ads destination', () => {
  const events=[]
  const tracking=load('lib/paidBookingTracking.ts', {
    '@/lib/gtag': { AW_PURCHASE_DESTINATION: SC_ADS + '/' + SC_LABEL, trackEvent:(name,params)=>events.push([name,params]) },
  }, { window:{} })
  tracking.trackPaidBooking({ paymentId:'pay-1',orderId:'order-1',orderNumber:'SC-TEST',amountPaid:125,totalPaid:125,totalAmount:500,balanceDue:375,currency:'USD',status:'succeeded',paidAt:'2026-09-22T12:00:00Z',purchaseEligible:true })
  assert.equal(events.length,2)
  assert.equal(events[0][1].value,125)
  assert.equal(events[1][1].send_to,SC_ADS+'/'+SC_LABEL)
  assert.doesNotMatch(JSON.stringify(events),/AW-18374628389|ig-ZCL_Q1d0cEKWo2rlE/)
})

test('SC confirmation no longer trusts cached browser totals for purchase conversion', () => {
  const confirmation = fs.readFileSync(path.join(root,'app/(public)/checkout/confirmation/page.tsx'),'utf8')
  const payment = fs.readFileSync(path.join(root,'app/(public)/checkout/payment/page.tsx'),'utf8')
  const route = fs.readFileSync(path.join(root,'app/api/orders/[id]/confirm-payment/route.ts'),'utf8')
  assert.match(confirmation,/PaymentReceiptSummary/)
  assert.match(confirmation,/stripePaymentId/)
  assert.doesNotMatch(confirmation,/trackEvent\('purchase'/)
  assert.doesNotMatch(confirmation,/parsed\.totalAmount/)
  assert.match(payment,/stripePaymentId/)
  assert.doesNotMatch(payment,/orderNumber: finalOrderNumber/)
  assert.match(route,/amount_received/)
  assert.match(route,/buildPaymentReceipt/)
})

test('SC public pay page renders the recorded state instead of a hardcoded NY state', () => {
  const pay = fs.readFileSync(path.join(root,'app/(public)/pay/[id]/page.tsx'),'utf8')
  assert.match(pay,/order\.eventState \|\| 'SC'/)
  assert.doesNotMatch(pay,/\{order\.eventCity\} NY/)
})


test('SC Popular Rentals has one booking-history source of truth for live home and Website Builder', () => {
  const engine = fs.readFileSync(path.join(root,'lib/homepageMerchandising.ts'),'utf8')
  const page = fs.readFileSync(path.join(root,'app/(public)/page.tsx'),'utf8')
  const admin = fs.readFileSync(path.join(root,'app/api/admin/website/home/data/route.ts'),'utf8')
  const mobile = fs.readFileSync(path.join(root,'components/public/MobileHome.tsx'),'utf8')
  assert.match(engine,/distinct qualifying SC bookings|Rank by distinct qualifying SC bookings/)
  assert.match(engine,/status:\{notIn:\['canceled','cancelled','quote','draft','incomplete'\]\}/)
  assert.match(engine,/count>=2/)
  assert.match(engine,/type:'Regular'/)
  assert.match(engine,/NON_FEATURED_NAME/)
  assert.match(page,/getHomepagePopularItems\(8\)/)
  assert.match(admin,/getHomepagePopularItems\(8\)/)
  assert.doesNotMatch(page,/popularItems = await prisma\.item\.findMany/)
  assert.doesNotMatch(admin,/popularItemsRaw = await prisma\.item\.findMany/)
  assert.match(mobile,/data-home-section="popular"/)
  assert.match(mobile,/data-home-section="bounce"/)
  assert.match(mobile,/popularItems\.map\(product\)/)
})

test('SC Popular Rentals candidate filter rejects add-ons and non-products', () => {
  const mod = load('lib/homepageMerchandising.ts', {
    '@/lib/prisma': { prisma:{} },
    '@/lib/imageVersion': { IMAGE_CACHE_BUST:'test' },
  })
  const valid={name:'20x20 Pole Tent',specialDisplayName:null,slug:'20x20-pole-tent'}
  assert.equal(mod.isHomepageFeatureCandidate(valid),true)
  for(const name of ['Photo Booth Print Upgrade','Extra Hour','Simple Centerpiece','55','Laptop Rental']){
    assert.equal(mod.isHomepageFeatureCandidate({...valid,name,slug:name.toLowerCase().replace(/ /g,'-')}),false)
  }
})
