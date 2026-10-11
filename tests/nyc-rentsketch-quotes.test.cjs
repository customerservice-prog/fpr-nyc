const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const crypto = require('node:crypto')
const ts = require('typescript')

const secret = 'local-test-signature-secret'
const code = ts.transpileModule(fs.readFileSync('app/api/integrations/rentsketch/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function load({ saveFails = false, emailFails = false } = {}) {
  const records = new Map(), emails = [], snapshots = []
  const module = { exports: {} }
  class InventoryError extends Error {}
  class SyncError extends Error {}
  const mocks = {
    crypto,
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    '@/lib/prisma': { prisma: { contactMessage: { upsert: async row => {
      if (saveFails) throw new Error('Mock database failure')
      if (!records.has(row.where.id)) records.set(row.where.id, row.create)
      return records.get(row.where.id)
    } } } },
    '@/lib/email': { sendEmail: async message => {
      emails.push(message)
      if (emailFails) throw new Error('Mock mail failure')
      return { success: true, simulated: false }
    } },
    '@/lib/nycEmail': { NYC_NOTIFICATION_EMAIL: 'staff@example.invalid' },
    '@/lib/nycPublicOrigin': { NYC_PUBLIC_ORIGIN: 'https://friendlypartyrentalnyc.com' },
    '@/lib/nycRentSketchOrderAccess': { lookupNycRentSketchOrder: async () => null },
    '@/lib/nycRentSketchInventory': { NycRentSketchInventoryError: InventoryError, nycRentSketchInventorySnapshot: async data => {
      snapshots.push(data)
      return { inventoryVersion: 1, items: [] }
    } },
    '@/lib/nycRentSketchOrderSync': { NycRentSketchOrderSyncError: SyncError, syncNycRentSketchOrder: async () => ({ ok: true }) },
  }
  vm.runInNewContext(code, {
    module, exports: module.exports, Buffer, Date, process: { env: { RENTSKETCH_WEBHOOK_SECRET: secret } },
    console: { error() {} }, require: id => {
      assert.ok(id in mocks, 'Unexpected import ' + id)
      return mocks[id]
    },
  })
  async function post(payload, signature) {
    const raw = JSON.stringify(payload)
    const signed = signature ?? crypto.createHmac('sha256', secret).update(raw).digest('hex')
    return module.exports.POST({ text: async () => raw, headers: { get: () => signed } })
  }
  return { post, records, emails, snapshots }
}

const quote = {
  type: 'quote_request.created', createdAt: new Date().toISOString(), data: {
    id: 'local-quote-example', designId: 'local-design-example', customerName: 'QA <Example>',
    customerEmail: 'qa@example.invalid', customerPhone: '202-555-0100', eventDate: '2027-06-12',
    eventType: 'Graduation', guestCount: 32, plannerSource: 'nyc_design_page', estimateTotal: 645,
    lineItems: [{ qty: 1, label: '20x20 Riverdale package', amount: 645 }],
    property: { address: 'Riverdale test address', widthFt: 40, lengthFt: 50, surfaceType: 'grass', needDance: true, tentId: 'pole-20x20' },
    notes: 'Local mock only <script>alert(1)</script>',
  },
}

test('signed NYC quote reaches the visible planning queue with complete details and staff notification', async () => {
  const api = load()
  const result = await api.post(quote)
  assert.equal(result.status, 200)
  assert.equal(result.body.notificationSent, true)
  const saved = [...api.records.values()][0]
  assert.equal(saved.id, 'planning_rentsketch_nyc_local-quote-example')
  assert.equal(saved.eventDate.toISOString().slice(0, 10), '2027-06-12')
  for (const text of ['Source: nyc_design_page', 'Usable area: 40 x 50 ft', 'Submitted estimate: $645.00', '1 x 20x20 Riverdale package — $645.00', 'Dance floor requested: Yes']) assert.ok(saved.message.includes(text))
  assert.equal(api.emails[0].to, 'staff@example.invalid')
  assert.equal(api.emails[0].replyTo, 'qa@example.invalid')
  assert.ok(api.emails[0].html.includes('https://friendlypartyrentalnyc.com/admin/planning-inquiries'))
  assert.ok(api.emails[0].html.includes('&lt;script&gt;'))
  assert.ok(!api.emails[0].html.includes('<script>'))
  await api.post(quote)
  assert.equal(api.records.size, 1, 'Webhook retry must not duplicate the planning inquiry')
})

test('unauthenticated quote performs no database write or notification', async () => {
  const api = load()
  assert.equal((await api.post(quote, 'invalid')).status, 401)
  assert.equal(api.records.size, 0)
  assert.equal(api.emails.length, 0)
})

test('quote database failure returns a retryable error without sending staff an unsaved inquiry', async () => {
  const api = load({ saveFails: true })
  assert.equal((await api.post(quote)).status, 502)
  assert.equal(api.emails.length, 0)
})

test('notification failure keeps the inquiry and reports delivery failure', async () => {
  const api = load({ emailFails: true })
  const result = await api.post(quote)
  assert.equal(result.status, 502)
  assert.equal(result.body.saved, true)
  assert.equal(api.records.size, 1)
})

test('inventory requests retain their signature and freshness checks', async () => {
  const api = load()
  const payload = { type: 'event_pass.inventory_snapshot', createdAt: new Date().toISOString(), data: { eventDate: '2027-06-12', slugs: ['20x20-pole-tent'] } }
  assert.equal((await api.post(payload, 'invalid')).status, 401)
  assert.equal((await api.post({ ...payload, createdAt: '2020-01-01T00:00:00Z' })).status, 401)
  const result = await api.post(payload)
  assert.equal(result.status, 200)
  assert.equal(result.body.inventoryVersion, 1)
  assert.equal(api.snapshots.length, 1)
  assert.equal(api.records.size, 0)
  assert.equal(api.emails.length, 0)
})

const feedback = {
  type: 'feedback.created', createdAt: new Date().toISOString(), data: {
    feedbackType: 'problem', customerEmail: 'qa@example.invalid', entryMode: 'designer',
    productId: 'local-product-example', viewMode: '3d',
    pageUrl: 'https://rentsketch.com/designer/?tenant=friendly-nyc',
    message: 'Local mock feedback only <script>alert(1)</script>',
  },
}

test('signed NYC feedback notifies staff with escaped context without creating a quote', async () => {
  const api = load()
  const result = await api.post(feedback)
  assert.equal(result.status, 200)
  assert.equal(result.body.notificationSent, true)
  assert.equal(api.records.size, 0)
  assert.equal(api.emails.length, 1)
  assert.equal(api.emails[0].to, 'staff@example.invalid')
  assert.equal(api.emails[0].replyTo, 'qa@example.invalid')
  for (const text of ['Riverdale RentSketch feedback', 'Type: problem', 'View: 3d', 'local-product-example', '&lt;script&gt;']) assert.ok(api.emails[0].html.includes(text))
  assert.ok(!api.emails[0].html.includes('<script>'))
})

test('unsigned NYC feedback sends nothing and notification failures are not acknowledged as delivered', async () => {
  const unsigned = load()
  assert.equal((await unsigned.post(feedback, 'invalid')).status, 401)
  assert.equal(unsigned.emails.length, 0)
  const failed = load({ emailFails: true })
  const result = await failed.post(feedback)
  assert.equal(result.status, 502)
  assert.equal(result.body.notificationSent, undefined)
  assert.equal(failed.records.size, 0)
})
