const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')

const read = file => fs.readFileSync(file, 'utf8')

test('NYC checkout and admin share one scheduling rule module', () => {
  const checkout = read('app/(public)/checkout/page.tsx')
  const admin = read('app/admin/orders/[id]/page.tsx')
  const component = read('components/admin/NycAdminScheduleFields.tsx')
  assert.match(checkout, /from '@\/lib\/nycOrderScheduling'/)
  assert.match(admin, /from '@\/lib\/nycOrderScheduling'/)
  assert.match(component, /from '@\/lib\/nycOrderScheduling'/)
  assert.doesNotMatch(checkout, /const DELIVERY_WINDOWS/)
  assert.doesNotMatch(admin, /DROPOFF_SLOT_LABELS/)
})

test('NYC admin schedule editor uses the owner-approved checkout policy for premium timing', () => {
  const component = read('components/admin/NycAdminScheduleFields.tsx')
  assert.match(component, /useCheckoutPolicy/)
  assert.match(component, /policy\?\.exactDeliveryFee/)
  assert.match(component, /exactPickupFeeForPolicy/)
  assert.match(component, /Not enabled in NYC checkout policy/)
  assert.doesNotMatch(component, /EXACT_DELIVERY_FEE\s*=\s*50/)
})

test('NYC admin order API derives schedule fees server-side and adjusts totals', () => {
  const api = read('app/api/admin/orders/[id]/route.ts')
  assert.match(api, /parseNycCheckoutPolicy\(process\.env\.NYC_CHECKOUT_POLICY_JSON\)/)
  assert.match(api, /exactPickupFeeForPolicy/)
  assert.match(api, /nextExactDeliveryFee = policy\.exactDeliveryFee/)
  assert.match(api, /scheduleTaxAmount/)
  assert.match(api, /scheduleTotalAmount/)
  assert.match(api, /scheduleBalanceDue/)
  assert.doesNotMatch(api, /exactDeliveryFee:\s*body\.exactDeliveryFee/)
  assert.doesNotMatch(api, /exactPickupFee:\s*body\.exactPickupFee/)
})

test('NYC admin schedule save persists structured fields instead of only legacy labels', () => {
  const page = read('app/admin/orders/[id]/page.tsx')
  for (const field of [
    'eventStartTime:',
    'eventEndTimeValue:',
    'deliveryWindowStart:',
    'deliveryWindowEnd:',
    'exactDeliveryRequested:',
    'exactDeliveryTime:',
    'pickupType:',
    'pickupRequiredByTime:',
    'exactPickupTime:',
  ]) assert.ok(page.includes(field), 'missing structured schedule field ' + field)
  assert.match(page, /NycAdminScheduleFields/)
  assert.match(page, /scheduleIsValid/)
  assert.match(page, /scheduleLegacyLabels/)
})

test('NYC admin rejects impossible schedule timing before saving money-affecting fields', () => {
  const api = read('app/api/admin/orders/[id]/route.ts')
  assert.match(api, /Event end time must be after a valid event start time/)
  assert.match(api, /Exact delivery must be at or before the event start time/)
  assert.match(api, /Choose a valid delivery window that ends before the event starts/)
  assert.match(api, /Guaranteed exact delivery is not enabled in the NYC checkout policy/)
  assert.match(api, /That guaranteed pickup time is not enabled in the NYC checkout policy/)
})
