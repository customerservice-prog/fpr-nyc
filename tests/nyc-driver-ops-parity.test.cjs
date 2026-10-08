const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const read=f=>fs.readFileSync(f,'utf8')

test('driver access supports admin, linked driver staff, and signed PIN sessions',()=>{
 const access=read('lib/driverAccess.ts')
 assert.match(access,/resolveRequestAuth/)
 assert.match(access,/role === 'driver'/)
 assert.match(access,/driverProfile/)
 assert.match(access,/verifyDriverToken/)
 assert.match(access,/isActive/)
})

test('driver navigation prefers a valid ZIP over ambiguous imported city text',()=>{
 const nav=read('lib/driverNavigation.ts')
 assert.match(nav,/validZip/)
 assert.match(nav,/\[street, state, zip, 'USA'\]/)
 assert.match(nav,/google\.com\/maps\/dir/)
})

test('driver route only completes assigned delivery or pickup work',()=>{
 const route=read('app/api/driver/orders/route.ts')
 assert.match(route,/resolveDriverAccess/)
 assert.match(route,/canCompleteDelivery:deliveryOnDate&&deliveryAssigned/)
 assert.match(route,/canCompletePickup:pickupOnDate&&pickupAssigned/)
 assert.match(route,/Not assigned to this order/)
 assert.match(route,/SELECT id FROM "Order" WHERE id =/)
 assert.match(route,/status:\{notIn:\['cancelled','canceled','quote','incomplete'\]\}/)
})

test('driver payments require driver access and reuse NYC guarded checkout',()=>{
 const route=read('app/api/driver/payments/route.ts')
 assert.match(route,/resolveDriverAccess/)
 assert.match(route,/Driver staff accounts cannot process payments/)
 assert.match(route,/assigned to another driver/)
 assert.match(route,/Amount exceeds the remaining balance/)
 assert.match(route,/POST as checkout/)
 assert.match(route,/new NextRequest\(new URL\('\/api\/checkout'/)
 assert.doesNotMatch(route,/paymentIntents\.create/)
})

test('driver card reader uses driver payment endpoint rather than public checkout directly',()=>{
 const page=read('app/driver/card-reader/page.tsx')
 assert.match(page,/fetch\('\/api\/driver\/payments'/)
 assert.doesNotMatch(page,/fetch\('\/api\/checkout'/)
})

test('driver contract uses a customer handoff screen',()=>{
 const page=read('app/driver/order/[id]/contract/page.tsx')
 assert.match(page,/Hand the device to the customer/)
 assert.match(page,/review the complete rental agreement and sign it themselves/)
 assert.match(page,/\/contract\//)
})

test('driver page uses shared navigation and respects completion permissions',()=>{
 const page=read('app/driver/page.tsx')
 assert.match(page,/driverNavigationUrl\(s\)/)
 assert.match(page,/Take Card Payment/)
 assert.match(page,/s\.canCompleteDelivery===false/)
 assert.match(page,/s\.canCompletePickup===false/)
})
