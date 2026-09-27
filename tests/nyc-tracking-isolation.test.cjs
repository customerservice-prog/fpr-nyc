const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const test = require('node:test')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const SYRACUSE_GA = 'G-NV8CF7GT5C'
const NYC_GA = 'G-NYCTEST123'

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

test('NYC Google analytics is off by default and Ads remains disabled', () => {
  const { tracking, calls } = tracker()
  assert.equal(tracking.GA_MEASUREMENT_ID, '')
  assert.equal(tracking.AW_CONVERSION_ID, '')
  assert.equal(tracking.AW_PURCHASE_DESTINATION, '')
  assert.equal(tracking.GOOGLE_TAG_ID, '')
  assert.equal(tracking.GOOGLE_TAG_BOOTSTRAP, '')
  tracking.trackEvent('purchase', { transaction_id: 'offline-stub' })
  tracking.trackEvent('conversion', { send_to: 'AW-123/test' })
  assert.deepEqual(calls, [])
})

test('copied Syracuse GA and malformed IDs are rejected', () => {
  for (const value of [SYRACUSE_GA, "G-INVALID';alert(1)//", 'AW-123456789', '']) {
    const { tracking } = tracker({ NEXT_PUBLIC_NYC_GA_MEASUREMENT_ID: value })
    assert.equal(tracking.GA_MEASUREMENT_ID, '')
    assert.equal(tracking.GOOGLE_TAG_ID, '')
    assert.equal(tracking.GOOGLE_TAG_BOOTSTRAP, '')
  }
})

test('valid NYC GA config initializes only the NYC GA destination', () => {
  const { tracking, calls, window } = tracker({ NEXT_PUBLIC_NYC_GA_MEASUREMENT_ID: NYC_GA })
  vm.runInNewContext(tracking.GOOGLE_TAG_BOOTSTRAP, { window })
  assert.equal(tracking.GA_MEASUREMENT_ID, NYC_GA)
  assert.equal(tracking.GOOGLE_TAG_ID, NYC_GA)
  assert.deepEqual(calls.filter(call => call[0] === 'config'), [['config', NYC_GA]])
  assert.doesNotMatch(tracking.GOOGLE_TAG_BOOTSTRAP, /AW-/)
})

test('NYC events queue and purchase events dedupe while conversions stay disabled', () => {
  const browserWindow = {}
  const tracking = load('lib/gtag.ts', {}, {
    process: { env: { NEXT_PUBLIC_NYC_GA_MEASUREMENT_ID: NYC_GA } },
    window: browserWindow,
  })
  tracking.trackEvent('begin_checkout', { value: 100, currency: 'USD' })
  tracking.trackEvent('purchase', { transaction_id: 'NYC-100', value: 100, currency: 'USD' })
  tracking.trackEvent('purchase', { transaction_id: 'NYC-100', value: 100, currency: 'USD' })
  tracking.trackEvent('conversion', { transaction_id: 'NYC-100', send_to: 'AW-123/test' })
  const commands = Array.from(browserWindow.dataLayer || [], entry => Array.from(entry))
  assert.equal(commands.length, 2)
  assert.deepEqual(commands.map(entry => entry[1]), ['begin_checkout', 'purchase'])
  assert.equal(commands[0][2].send_to, NYC_GA)
  assert.equal(commands[1][2].send_to, NYC_GA)
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
    '@/lib/utils': { BUSINESS: {
      name:'Friendly Party Rental NYC',
      legalName:'Friendly Party Rental L.L.C.',
      phone:'315-884-1498',
      email:'customerservice@friendlypartyrental.com',
    } },
    '@/lib/nycServiceAreas': { NYC_SERVICE_AREAS: [
      { name:'Riverdale' }, { name:'Yonkers' }, { name:'Mount Vernon' }, { name:'New Rochelle' },
    ] },
    './globals.css': {},
  }, { process: { env: {} }, URL }).default({ children: 'Checkout remains available' })
}

test('unconfigured NYC layout renders no Google remote script; configured GA stays NYC-only', () => {
  const rendered = JSON.stringify(layout(tracker().tracking))
  assert.doesNotMatch(rendered, /googletagmanager|ga4-init|G-NV8CF7GT5C/)
  assert.match(rendered, /Checkout remains available/)
  assert.match(rendered, /VisitorTracker/)

  const configured = tracker({ NEXT_PUBLIC_NYC_GA_MEASUREMENT_ID: NYC_GA }).tracking
  const configuredRender = JSON.stringify(layout(configured))
  assert.match(configuredRender, /googletagmanager/)
  assert.match(configuredRender, /G-NYCTEST123/)
  assert.doesNotMatch(configuredRender, /AW-|G-NV8CF7GT5C/)
})

test('NYC root schema and metadata contain no South Carolina market residue', () => {
  const source = fs.readFileSync(path.join(root, 'app/layout.tsx'), 'utf8')
  assert.match(source, /NYC_SERVICE_AREAS/)
  assert.match(source, /PUBLIC_INDEXABLE/)
  assert.doesNotMatch(source, /addressRegion:\s*['"]SC['"]/)
  assert.doesNotMatch(source, /South Carolina|Greenville|Anderson, SC|Spartanburg, SC|Carolina party rental/i)
  assert.doesNotMatch(source, /google\.com\/maps\?cid=/)
})

test('NYC config never redirects the SC Railway service into NYC', () => {
  const source = fs.readFileSync(path.join(root, 'next.config.js'), 'utf8')
  for (const header of ['Content-Security-Policy','Strict-Transport-Security','X-Content-Type-Options','Referrer-Policy','X-Frame-Options','Cross-Origin-Opener-Policy']) {
    assert.match(source, new RegExp(header))
  }
  assert.match(source, /form-action 'self' https:\/\/fpr-nyc-production\.up\.railway\.app/)
  assert.doesNotMatch(source, /friendly-party-rental-greenville-sc-production\.up\.railway\.app/)
  assert.doesNotMatch(source, /friendlypartyrentalsc\.com/)
  assert.match(source, /X-Robots-Tag/)
  assert.match(source, /\/checkout\/:path\*/)
})

test('NYC public payment and confirmation surfaces use NYC identity', () => {
  const pay = fs.readFileSync(path.join(root, 'app/(public)/pay/[id]/page.tsx'), 'utf8')
  const confirmation = fs.readFileSync(path.join(root, 'app/(public)/checkout/confirmation/page.tsx'), 'utf8')
  assert.match(pay, /order\.eventState \|\| 'NY'/)
  assert.doesNotMatch(pay, /order\.eventState \|\| 'SC'/)
  assert.match(confirmation, /NYC%20%2F%20Downstate/)
  assert.doesNotMatch(confirmation, /South%20Carolina|Greenville/)
})

test('server rendering never emits browser events even when NYC GA is configured', () => {
  const { tracking, calls } = tracker({ NEXT_PUBLIC_NYC_GA_MEASUREMENT_ID: NYC_GA }, false)
  assert.doesNotThrow(() => tracking.trackEvent('purchase'))
  assert.deepEqual(calls, [])
})

test('paid booking helper cannot emit an Ads conversion while Ads is disabled', () => {
  const events = []
  const tracking = load('lib/paidBookingTracking.ts', {
    '@/lib/gtag': { AW_PURCHASE_DESTINATION: '', trackEvent:(name,params)=>events.push([name,params]) },
    '@/lib/paymentReceipt': {},
  }, { window:{} })
  tracking.trackPaidBooking({
    paymentId:'pay-1', orderId:'order-1', orderNumber:'NYC-TEST',
    amountPaid:125, totalPaid:125, totalAmount:500, balanceDue:375,
    currency:'USD', status:'succeeded', paidAt:'2026-09-27T12:00:00Z', purchaseEligible:true,
  })
  assert.equal(events.length,1)
  assert.equal(events[0][0],'purchase')
})
