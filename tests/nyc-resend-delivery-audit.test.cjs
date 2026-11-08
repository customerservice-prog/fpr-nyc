const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const crypto = require('node:crypto')
const ts = require('typescript')

const read = (path) => fs.readFileSync(path, 'utf8')
const webhook = read('app/api/webhooks/resend/route.ts')

function verifier() {
  const start = webhook.indexOf('function verifyNycResendSignature(')
  const end = webhook.indexOf('\nexport async function POST(', start)
  assert.ok(start >= 0 && end > start, 'signature verification function must exist')
  const code = ts.transpileModule(webhook.slice(start, end) + '\nmodule.exports = verifyNycResendSignature', {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText
  const module = { exports: null }
  vm.runInNewContext(code, { module, crypto, createHmac: crypto.createHmac, timingSafeEqual: crypto.timingSafeEqual, Buffer, Date, Number, Math })
  return module.exports
}

test('NYC Svix signature is verified over raw body, with freshness and constant-time comparison', () => {
  const verify = verifier()
  const secret = 'whsec_' + Buffer.from('test_key_with_minimum_32_byte_length_here').toString('base64')
  const id = 'msg-signature-test'
  const ts = String(Math.floor(Date.now() / 1000))
  const raw = JSON.stringify({ type: 'email.delivered', data: { email_id: 'nyc-provider-id' } })
  const signature = crypto.createHmac('sha256', Buffer.from(secret.slice(6), 'base64')).update(id+'.'+ts+'.'+raw).digest('base64')
  const headers = new Headers({ 'svix-id': id, 'svix-timestamp': ts, 'svix-signature': 'v1,'+signature })
  assert.equal(verify(raw, headers, secret), true)
  assert.equal(verify(raw+' ', headers, secret), false)
  assert.equal(verify(raw, headers, 'whsec_'+Buffer.from('a_completely_different_signing_key').toString('base64')), false)
  assert.equal(verify(raw, new Headers({'svix-id':id,'svix-timestamp':String(Number(ts)-601),'svix-signature':'v1,'+signature}), secret), false)
  assert.equal(verify(raw, new Headers({'svix-id':id,'svix-timestamp':ts,'svix-signature':'v0,'+signature}), secret), false)
  assert.equal(verify(raw, new Headers({'svix-id':id,'svix-timestamp':ts}), secret), false)
})

test('only NYC-originated Resend IDs may create NYC delivery records', () => {
  const schema = read('prisma/schema.prisma')
  const sql = read('prisma/migrations/20261108172000_nyc_resend_delivery_tracking/migration.sql')
  const sender = read('lib/email.ts')
  assert.match(sender, /prisma\.nycOutboundEmail\.upsert/)
  assert.match(sender, /providerMessageId: resend\.providerId/)
  assert.match(schema, /model NycOutboundEmail/)
  assert.match(schema, /model NycEmailDeliveryEvent/)
  assert.match(sql, /CREATE UNIQUE INDEX "NycOutboundEmail_providerMessageId_key"/)
  assert.match(webhook, /nycOutboundEmail\.findUnique/)
  assert.match(webhook, /if \(!known\) return \{ matched: false/)
  assert.match(webhook, /nycEmailDeliveryEvent\.createMany/)
  assert.match(webhook, /skipDuplicates: true/)
  assert.match(webhook, /NYC_RESEND_WEBHOOK_SECRET/)
  assert.doesNotMatch(webhook, /RESEND_WEBHOOK_SECRET \|\|/)
  assert.doesNotMatch(schema.split('model NycOutboundEmail ')[1].split('model NycEmailDeliveryEvent')[0], /subject|recipient|customer|html|body/)
})

test('NYC email status page remains authenticated and read-only', () => {
  const page = read('app/admin/settings/email-delivery/audit/page.tsx')
  assert.match(page, /getServerSession/)
  assert.match(page, /role !== 'admin'/)
  assert.match(page, /prisma\.nycOutboundEmail\.groupBy/)
  assert.doesNotMatch(page, /sendEmail\(|fetch\(|stripe|\.create\(/)
  assert.match(read('app/admin/settings/nyc-launch-readiness/page.tsx'), /View NYC email delivery audit/)
})
