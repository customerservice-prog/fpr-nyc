const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')

const payments = fs.readFileSync('lib/payments.ts', 'utf8')

test('NYC staff alert is emitted only after payment is committed, never for Stripe duplicate', () => {
  const transaction = payments.indexOf('const result = await prisma.$transaction')
  const duplicateGuard = payments.indexOf('if (result.duplicate) return updated')
  const alert = payments.indexOf('if (result.staffAlertId) {')
  assert.ok(transaction >= 0 && duplicateGuard > transaction && alert > duplicateGuard)
  assert.match(payments, /existingPaymentIds = new Set\(order\.payments\.map/)
  assert.match(payments, /updated\.payments\.find\(payment => !existingPaymentIds\.has\(payment\.id\)\)/)
  assert.match(payments, /duplicate: true, overpaidBy: 0, staffAlertId: null/)
  assert.match(payments, /idempotencyKey: 'nyc-payment-alert\/' \+ result\.staffAlertId/)
})

test('NYC staff notification has NYC identity, payment and balance, and is not a charge', () => {
  const start = payments.indexOf('if (result.staffAlertId) {')
  const end = payments.indexOf('if (result.overpaidBy > 0) {', start)
  const block = payments.slice(start, end)
  assert.ok(block)
  assert.match(block, /ownerNotificationRecipients\(\)/)
  assert.match(block, /\[NYC Payment\]/)
  assert.match(block, /NYC \/ Riverdale/)
  assert.match(block, /Remaining balance/)
  assert.match(block, /'\/admin\/orders\/'/)
  assert.match(block, /not an additional charge/)
  assert.doesNotMatch(block, /www\.friendlypartyrental\.com|315-884-1498|Syracuse/)
})

test('failure to send office email does not undo a captured payment', () => {
  const start = payments.indexOf('if (result.staffAlertId) {')
  const end = payments.indexOf('if (result.overpaidBy > 0) {', start)
  const block = payments.slice(start, end)
  assert.match(block, /catch\s*\{/)
  assert.match(block, /Staff payment notification could not be sent/)
  assert.doesNotMatch(block, /throw|return NextResponse/)
})
