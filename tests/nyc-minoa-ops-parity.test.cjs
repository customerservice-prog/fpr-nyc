const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')

const read = file => fs.readFileSync(file, 'utf8')

test('NYC admin can change an existing order between delivery and customer pickup', () => {
  const page = read('app/admin/orders/[id]/page.tsx')
  const api = read('app/api/admin/orders/[id]/route.ts')
  assert.match(page, /editDeliveryType/)
  assert.match(page, /<option value="delivery">Delivery<\/option>/)
  assert.match(page, /<option value="pickup">Customer Pickup<\/option>/)
  assert.match(page, /deliveryType: editDeliveryType/)
  assert.match(page, /Changing the rental method updates this order/)
  assert.match(api, /Delivery type must be delivery or pickup/)
})

test('NYC delivery fee is a manual financial-summary control', () => {
  const page = read('app/admin/orders/[id]/page.tsx')
  assert.match(page, /Delivery Fee \(\$\)/)
  assert.match(page, /Save Fee/)
  assert.match(page, /Type the exact delivery fee you want/)
  assert.doesNotMatch(page, /Override Travel Fee \(\$\)/)
  assert.match(page, /await loadOrder\(\)/)
})

test('NYC transactional email rejects obvious typos and builds useful plaintext', () => {
  const email = read('lib/email.ts')
  assert.match(email, /gamil\.com/)
  assert.match(email, /outlok\.com/)
  assert.match(email, /Likely mistyped customer email address/)
  assert.match(email, /replace\(\/<\\\/t\[dh\]>/)
  assert.match(email, /replace\(\/<\\\/tr>/)
})

test('NYC payment receipts no longer send duplicate internal copies', () => {
  const payments = read('lib/payments.ts')
  assert.doesNotMatch(payments, /subject:'\[Copy\] '/)
  assert.match(payments, /Overpayment on NYC order/)
})

test('transactional item tables do not embed remote product thumbnails', () => {
  const email = read('lib/email.ts')
  assert.doesNotMatch(email, /const imgTag =/)
})
