const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')

const read = file => fs.readFileSync(file, 'utf8')

test('NYC admin schedule editor uses the live NYC checkout policy and Riverdale wording', () => {
  const fields = read('components/admin/NycAdminScheduleFields.tsx')
  const helper = read('lib/nycAdminScheduling.ts')

  assert.match(fields, /useCheckoutPolicy\(\)/)
  assert.match(fields, /policy\?\.exactDeliveryFee/)
  assert.match(fields, /exactPickupFeeForPolicy/)
  assert.match(fields, /Customer Pickup — Riverdale/)
  assert.match(fields, /NYC public checkout remains delivery-only/)
  assert.doesNotMatch(fields, /EXACT_DELIVERY_FEE\s*=/)
  assert.doesNotMatch(fields, /return 50\b|return 75\b/)
  assert.doesNotMatch(fields, /Minoa|minoa/)
  assert.doesNotMatch(helper, /Minoa|minoa/)
})

test('NYC order admin saves structured schedule fields instead of old dropdown-only timing', () => {
  const page = read('app/admin/orders/[id]/page.tsx')
  assert.match(page, /NycAdminScheduleFields/)
  assert.match(page, /editSchedule/)
  assert.match(page, /eventStartTime: editDeliveryType === 'delivery'/)
  assert.match(page, /deliveryWindowStart:/)
  assert.match(page, /exactDeliveryRequested:/)
  assert.match(page, /pickupRequiredByTime:/)
  assert.match(page, /exactPickupTime:/)
  assert.match(page, /legacyScheduleLabels/)
  assert.doesNotMatch(page, /setEditDropoffSlot/)
  assert.doesNotMatch(page, /setEditPickupSlot/)
})

test('NYC server derives exact-time fees only from the owner-approved policy', () => {
  const route = read('app/api/admin/orders/[id]/route.ts')
  assert.match(route, /getNycCheckoutPolicy\(\)\.policy/)
  assert.match(route, /exactPickupFeeForPolicy/)
  assert.match(route, /policy\.exactDeliveryFee/)
  assert.match(route, /Guaranteed exact delivery is not currently approved in the NYC checkout policy/)
  assert.match(route, /That exact pickup time is not currently approved in the NYC checkout policy/)
  assert.doesNotMatch(route, /nextExactDeliveryFee.*50/)
  assert.doesNotMatch(route, /nextExactPickupFee.*75/)
})

test('NYC structured schedule changes update fee tax total and balance atomically', () => {
  const route = read('app/api/admin/orders/[id]/route.ts')
  assert.match(route, /previousScheduleFee/)
  assert.match(route, /nextScheduleFee/)
  assert.match(route, /scheduleFeeDelta/)
  assert.match(route, /scheduleTaxDelta/)
  assert.match(route, /existingOrder\.overrideTaxAmount == null/)
  assert.match(route, /safeTotalAmount/)
  assert.match(route, /safeBalanceDue/)
  assert.match(route, /taxAmount: \(canEditFinancials \|\| savingStructuredSchedule\)/)
  assert.match(route, /totalAmount: \(canEditFinancials \|\| savingStructuredSchedule\)/)
  assert.match(route, /balanceDue: \(canEditFinancials \|\| savingStructuredSchedule\)/)
})

test('fee-bearing schedule changes honor NYC staff pricing permissions', () => {
  const route = read('app/api/admin/orders/[id]/route.ts')
  assert.match(route, /hasStaffPermission\(role, 'edit_order_financials'\)/)
  assert.match(route, /This staff role cannot change a schedule option that changes the order price/)
  assert.match(route, /canProcessPayments\(role\)/)
})

test('NYC admin exact times are server-validated to the same half-hour ranges', () => {
  const route = read('app/api/admin/orders/[id]/route.ts')
  assert.match(route, /exactDeliveryMinutes < 8 \* 60/)
  assert.match(route, /exactDeliveryMinutes > 18 \* 60/)
  assert.match(route, /exactDeliveryMinutes % 30 !== 0/)
  assert.match(route, /exactPickupMinutes < 12 \* 60/)
  assert.match(route, /exactPickupMinutes > 23 \* 60 \+ 30/)
  assert.match(route, /exactPickupMinutes % 30 !== 0/)
})

test('public NYC checkout remains delivery-only after admin customer-pickup parity', () => {
  const orders = read('app/api/orders/route.ts')
  const quote = read('app/api/checkout/quote/route.ts')
  assert.match(orders, /requireDeliveryMethod/)
  assert.match(quote, /requireDeliveryMethod/)
})
