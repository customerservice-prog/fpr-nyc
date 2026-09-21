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
      'react': { useEffect: effect => effects.push(effect) },
      'next/navigation': { usePathname: () => '/category/tent-rentals' },
      '@/lib/gtag': { GA_MEASUREMENT_ID: id },
    }, { window: { gtag: (...args) => calls.push(args) } }).default
    component()
    effects.forEach(effect => effect())
    assert.equal(calls.length, id ? 1 : 0)
    if (id) assert.equal(calls[0][1], SC_GA)
  }
})

test('confirmation keeps the customer receipt and consumes its existing state without sending Google events while off', () => {
  const { tracking, calls } = tracker()
  const effects = [], states = [], removed = []
  let index = 0
  const component = load('app/(public)/checkout/confirmation/page.tsx', {
    'react': { useEffect: effect => effects.push(effect), useState: initial => {
      const current = index++
      if (!(current in states)) states[current] = initial
      return [states[current], value => { states[current] = value }]
    } },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/link': { default: 'Link' },
    '@/lib/utils': { formatCurrency: value => '$' + value },
    '@/lib/gtag': tracking,
  }, { sessionStorage: { getItem: () => JSON.stringify({ orderId: 'offline-stub', orderNumber: 'SC-STUB', totalAmount: 100, depositAmount: 25, balanceDue: 75 }), removeItem: key => removed.push(key) } }).default
  component()
  effects.splice(0).forEach(effect => effect())
  index = 0
  const rendered = JSON.stringify(component())
  assert.match(rendered, /Thank You!/)
  assert.match(rendered, /SC-STUB/)
  assert.match(rendered, /Deposit Paid/)
  assert.deepEqual(removed, ['order_confirmation'])
  assert.deepEqual(calls, [])
})

test('server rendering never emits browser events even when SC destinations are configured', () => {
  const { tracking, calls } = tracker(configured, false)
  assert.doesNotThrow(() => tracking.trackEvent('purchase'))
  assert.deepEqual(calls, [])
})
