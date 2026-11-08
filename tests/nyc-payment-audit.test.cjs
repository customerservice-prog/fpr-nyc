const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')

const page = fs.readFileSync('app/admin/reports/payment-audit/page.tsx', 'utf8')
const settings = fs.readFileSync('app/admin/settings/page.tsx', 'utf8')
const readiness = fs.readFileSync('app/admin/settings/nyc-launch-readiness/page.tsx', 'utf8')

test('NYC ledger audit is an authenticated admin-only read-only page', () => {
  assert.match(page, /getServerSession\(authOptions\)/)
  assert.match(page, /if \(!session\) redirect\('\/admin\/login'\)/)
  assert.match(page, /role !== 'admin'/)
  assert.match(page, /prisma\.payment\.findMany\(/)
  assert.match(page, /prisma\.stripeWebhookEvent\.findMany\(/)
  assert.match(page, /prisma\.payment\.aggregate\(/)
  assert.match(page, /status: 'succeeded', amount: \{ gt: 0 \}/)
  assert.match(page, /status: 'succeeded', amount: \{ lt: 0 \}/)
  assert.doesNotMatch(page, /prisma\.[a-zA-Z]+\.(?:create|update|delete|upsert|createMany|updateMany|deleteMany)\(/)
  assert.doesNotMatch(page, /\.refunds\.create|\.paymentIntents\.create|sendEmail\(/)
  assert.doesNotMatch(page, /customerservice@friendlypartyrental\.com|315-884-1498|Minoa|Syracuse/)
})

test('NYC ledger report flags webhook failures and refuses unverifiable totals', () => {
  assert.match(page, /\['failed', 'rejected', 'processing'\]/)
  assert.match(page, /No totals are displayed because the audit data could not be verified/)
  assert.match(page, /not proof that Stripe settled or deposited/)
  assert.match(page, /getServerSession/)
})

test('NYC audit is easy to find from order, settings, and launch-readiness screens', () => {
  assert.match(settings, /'NYC Payment Audit':'\/admin\/reports\/payment-audit'/)
  assert.match(readiness, /href="\/admin\/reports\/payment-audit"/)
  const orders = fs.readFileSync('app/admin/orders/page.tsx', 'utf8')
  assert.match(orders, /href="\/admin\/reports\/payment-audit"/)
})
