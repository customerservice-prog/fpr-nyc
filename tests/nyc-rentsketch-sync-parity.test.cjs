const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const read=f=>fs.readFileSync(f,'utf8')

test('NYC RentSketch advertises inventory and review-first order sync capabilities',()=>{
 const route=read('app/api/integrations/rentsketch/route.ts')
 assert.match(route,/inventoryVersion: 1/)
 assert.match(route,/orderSyncVersion: 1/)
 assert.match(route,/event_pass\.inventory_snapshot/)
 assert.match(route,/event_pass\.order_sync/)
})

test('all RentSketch operational requests stay behind signature and freshness checks',()=>{
 const route=read('app/api/integrations/rentsketch/route.ts')
 assert.match(route,/createHmac\('sha256', secret\)\.update\(raw\)/)
 assert.match(route,/timingSafeEqual/)
 assert.match(route,/if \(!fresh\(payload\.createdAt\)\)/)
 assert.match(route,/Expired inventory request/)
 assert.match(route,/Expired order sync request/)
})

test('NYC RentSketch inventory uses NYC stock holds and excludes the edited order when requested',()=>{
 const inventory=read('lib/nycRentSketchInventory.ts')
 assert.match(inventory,/holdsStockWhere/)
 assert.match(inventory,/rentalPeriod/)
 assert.match(inventory,/excludeOrderId/)
 assert.match(inventory,/status:\{notIn:\['canceled','cancelled','draft','incomplete'\]\}/)
 assert.match(inventory,/displayToCustomer/)
 assert.match(inventory,/bookableAfter/)
 assert.match(inventory,/missingSlugs/)
})

test('NYC RentSketch order sync uses optimistic concurrency and exact SKU sets',()=>{
 const sync=read('lib/nycRentSketchOrderSync.ts')
 assert.match(sync,/expectedUpdatedAt/)
 assert.match(sync,/order_revision_conflict/)
 assert.match(sync,/managedSlugs/)
 assert.match(sync,/desiredItems/)
 assert.match(sync,/createHash\('sha256'\)/)
 assert.match(sync,/inventory_conflict/)
 assert.match(sync,/catalog_conflict/)
})

test('RentSketch submit creates staff-review targets and never mutates paid order financials',()=>{
 const sync=read('lib/nycRentSketchOrderSync.ts')
 assert.match(sync,/requestType:'rentsketch_set_quantity'/)
 assert.match(sync,/status:'pending'/)
 assert.match(sync,/Superseded by a newer saved RentSketch layout/)
 assert.doesNotMatch(sync,/tx\.order\.update\(/)
 assert.doesNotMatch(sync,/tx\.orderItem\.(update|create|delete)/)
 assert.doesNotMatch(sync,/paymentIntents/)
 assert.doesNotMatch(sync,/taxAmount:/)
 assert.doesNotMatch(sync,/totalAmount:/)
})

test('RentSketch order lookup exposes revision and rental range for safe synchronization',()=>{
 const access=read('lib/nycRentSketchOrderAccess.ts')
 assert.match(access,/updatedAt: order\.updatedAt\.toISOString\(\)/)
 assert.match(access,/eventEndDate:/)
})

test('staff queue clearly labels RentSketch quantity targets',()=>{
 const queue=read('components/admin/OrderServiceRequestQueue.tsx')
 assert.match(queue,/rentsketch_set_quantity:'RentSketch quantity target'/)
})
