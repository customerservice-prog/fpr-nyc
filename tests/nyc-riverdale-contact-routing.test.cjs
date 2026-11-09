const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

const origin = { NYC_PUBLIC_HOST: 'friendlypartyrentalnyc.com', NYC_PUBLIC_ORIGIN: 'https://friendlypartyrentalnyc.com' }
function load(file, mocks = {}, env = {}) {
  const module = { exports: {} }
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  vm.runInNewContext(output, { module, exports: module.exports, process: { env }, console: { log() {}, warn() {}, error() {} }, URL, Date, Buffer, encodeURIComponent, fetch: mocks.fetch,
    require(id) { if (id in mocks) return mocks[id]; throw Error('Unexpected import: ' + id) } }, { filename: file })
  return module.exports
}
const location = load('lib/nycEmail.ts', { '@/lib/nycPublicOrigin': origin })

test('public email opens the NYC inbox with Riverdale subject and intact event details', () => {
  const href = new URL(location.nycEmailHref('Tent & chairs', 'Date: June 12\nRiverdale & Bronx'))
  assert.equal(href.pathname, 'friendlypartyrentalnyc@gmail.com')
  assert.equal(href.searchParams.get('subject'), '[NYC / Riverdale] Tent & chairs')
  assert.equal(href.searchParams.get('body'), 'Date: June 12\nRiverdale & Bronx')
  assert.equal(location.nycEmailSubject('[NYC / Downstate] [NYC / Riverdale] Inquiry\r\n'), '[NYC / Riverdale] Inquiry')
})

test('inherited catalog and saved website contact links resolve to the Riverdale contacts', async () => {
  const { localizeNycCatalogText, localizeNycContactText } = await import('../lib/nycCatalogCore.mjs')
  const html = '<a href="tel:+13158841498">(315) 884-1498</a> <a href="sms:3158841498">Text</a> <a href="mailto:customerservice@friendlypartyrental.com?subject=%5BNYC%20%2F%20Downstate%5D">Email</a>'
  const localized = localizeNycContactText(html)
  assert.match(localized, /tel:\+19172747857/)
  assert.match(localized, /sms:\+19172747857/)
  assert.match(localized, /917-274-7857/)
  assert.match(localized, /mailto:friendlypartyrentalnyc@gmail.com/)
  assert.doesNotMatch(localized, /315|Downstate/)
  assert.equal(localizeNycContactText(localized), localized)
  assert.match(localizeNycCatalogText('Call 315-884-1498 for table rentals in Syracuse.'), /917-274-7857.*Riverdale/)
})

test('contact form sends staff notification directly to daily inbox and keeps customer Reply-To', async () => {
  let message, saved = 0
  const route = load('app/api/contact/route.ts', {
    'next/server': { NextResponse: { json(body, options = {}) { return { body, status: options.status || 200 } } } },
    '@/lib/prisma': { prisma: { contactMessage: { async create() { saved++ } } } },
    '@/lib/nycEmail': location,
    '@/lib/nycPublicOrigin': origin,
    '@/lib/nycBookingWindow': { isNycPublicBookingDateOpen: () => true, NYC_PUBLIC_BOOKING_MESSAGE: '2027 only' },
    '@/lib/email': { contactFormEmail() { return { subject: 'New inquiry', html: '<p>Inquiry</p>' } }, async sendEmail(value) { message = value; return { success: true } } },
  })
  const result = await route.POST({ json: async () => ({ name: 'Test Customer', email: 'test@example.invalid', phone: '202-555-0100', message: 'Need tables for my event.', elapsedMs: 4000 }) })
  assert.equal(saved, 1)
  assert.equal(result.status, 200)
  assert.equal(message.to, 'customerservice@friendlypartyrental.com')
  assert.equal(message.replyTo, 'test@example.invalid')
  assert.equal(new URL(result.body.emailHref).pathname, 'friendlypartyrentalnyc@gmail.com')
})

test('Resend preserves verified sender address and labels all NYC mail as Riverdale', async () => {
  let envelope
  const mail = load('lib/email.ts', {
    nodemailer: { createTransport() { return {} } },
    '@/lib/prisma': { prisma: { nycOutboundEmail: { async upsert() { return { id: 'mock-tracked' } } } } },
    '@/lib/nycEmail': location,
    '@/lib/utils': { BUSINESS: { name: 'Friendly Party Rental NYC' }, formatDateTime() {} },
    '@/lib/nycBrand': { NYC_EMAIL_LOGO_URL: 'https://friendlypartyrentalnyc.com/logo.png' },
    '@/lib/nycPublicOrigin': origin,
    '@/lib/nycSalesTax': { formatTaxRatePercent() {} },
    fetch: async (_url, options) => { envelope = JSON.parse(options.body); return { ok: true, json: async () => ({ id: 'mock_only' }) } },
  }, { RESEND_API_KEY: 'mock_only', RESEND_FROM: 'Friendly Party Rental <orders@friendlypartyrentalnyc.com>' })
  await mail.sendEmail({ to: 'customerservice@friendlypartyrental.com,owner@example.invalid', subject: 'Order received', html: '<p>Order details</p>' })
  assert.deepEqual(envelope.to, ['customerservice@friendlypartyrental.com', 'owner@example.invalid'])
  assert.equal(envelope.from, 'Friendly Party Rental NYC - Riverdale <orders@friendlypartyrentalnyc.com>')
  assert.equal(envelope.subject, '[NYC / Riverdale] Order received')
  assert.deepEqual(envelope.reply_to, ['friendlypartyrentalnyc@gmail.com'])
  assert.match(envelope.html, /NYC \/ RIVERDALE LOCATION/)
  assert.match(envelope.html, /917-274-7857/)
  assert.match(envelope.text, /^NYC \/ RIVERDALE LOCATION/)
})

test('owner notifications stay in shared daily inbox after public Gmail change', () => {
  const notifications = load('lib/orderLifecycleNotifications.ts', { '@/lib/utils': {}, '@/lib/nycPublicOrigin': origin, '@/lib/nycEmail': location }, { OWNER_NOTIFICATION_EMAIL: 'customerservice@friendlypartyrental.com' })
  assert.equal(notifications.ownerNotificationRecipients(), 'customerservice@friendlypartyrental.com')
})


test('RentSketch quote without customer email stays a Riverdale inquiry, never a Syracuse contact', async () => {
  const crypto = require('node:crypto')
  const secret = 'test-only-rentsketch-secret'
  let saved, sent
  const route = load('app/api/integrations/rentsketch/route.ts', {
    crypto,
    'next/server': { NextResponse: { json(body, options = {}) { return { body, status: options.status || 200 } } } },
    '@/lib/prisma': { prisma: { contactMessage: { async upsert(value) { saved = value } } } },
    '@/lib/email': { async sendEmail(value) { sent = value; return { success: true, simulated: false } } },
    '@/lib/nycEmail': location,
    '@/lib/nycPublicOrigin': origin,
    '@/lib/nycRentSketchOrderAccess': { lookupNycRentSketchOrder: async () => null },
    '@/lib/nycRentSketchInventory': { NycRentSketchInventoryError: class extends Error {}, nycRentSketchInventorySnapshot: async () => ({}) },
    '@/lib/nycRentSketchOrderSync': { NycRentSketchOrderSyncError: class extends Error {}, syncNycRentSketchOrder: async () => ({}) },
  }, { RENTSKETCH_WEBHOOK_SECRET: secret })
  const payload = JSON.stringify({
    type: 'quote_request.created',
    data: { id: 'qa-phone-only', customerName: 'Customer Without Email', customerPhone: '202-555-0100' },
  })
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  const result = await route.POST({
    text: async () => payload,
    headers: { get: name => name === 'x-rentsketch-signature' ? signature : null },
  })
  assert.equal(result.status, 200)
  assert.equal(saved.create.email, location.NYC_EMAIL_ADDRESS)
  assert.equal(sent.to, location.NYC_NOTIFICATION_EMAIL)
  assert.equal(sent.replyTo, undefined)
  assert.match(saved.create.message, /Customer email: Not provided/)
  assert.match(sent.html, /<strong>Email:<\/strong> Not provided/)
})

test('NYC Google Calendar setup never directs staff to a Syracuse account', () => {
  const source = fs.readFileSync('components/admin/MediaPanel.tsx', 'utf8')
  assert.match(source, /calendarStatus\.expectedEmail \|\| NYC_EMAIL_ADDRESS/)
  assert.doesNotMatch(source, /calendarStatus\.expectedEmail \|\| 'customerservice@friendlypartyrental\.com'/)
})
