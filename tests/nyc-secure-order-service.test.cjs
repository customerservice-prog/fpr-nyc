const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const read=f=>fs.readFileSync(f,'utf8')

test('NYC secure order service stores only hashed verification values and signed short sessions',()=>{
 const security=read('lib/nycOrderServiceSecurity.ts')
 assert.match(security,/createHmac\('sha256'/)
 assert.match(security,/NYC_ORDER_SERVICE_SESSION_TTL_SECONDS = 30 \* 60/)
 assert.match(security,/NYC_ORDER_VERIFICATION_TTL_MS = 10 \* 60 \* 1000/)
 assert.match(security,/timingSafeEqual/)
 assert.doesNotMatch(security,/email/)
})

test('verification endpoint is generic, rate limited, one-time and HttpOnly',()=>{
 const route=read('app/api/order-service/access/route.ts')
 assert.match(route,/MAX_ORDER_LOOKUPS=4/)
 assert.match(route,/MAX_IP_LOOKUPS=12/)
 assert.match(route,/randomInt\(0,1_000_000\)/)
 assert.match(route,/status:'consumed'/)
 assert.match(route,/httpOnly:true/)
 assert.match(route,/sameSite:'lax'/)
 assert.match(route,/Cache-Control':'no-store, private'/)
 assert.match(route,/If that order can be verified online/)
})

test('verified customers can only create review requests and cannot mutate orders',()=>{
 const route=read('app/api/order-service/requests/route.ts')
 assert.match(route,/verifyNycOrderServiceSession/)
 assert.match(route,/orderChangeRequest\.create/)
 assert.match(route,/Your paid order has not changed yet/)
 assert.doesNotMatch(route,/prisma\.order\.update/)
 assert.doesNotMatch(route,/paymentIntents/)
 assert.doesNotMatch(route,/stripe/)
})

test('staff review queue marks requests handled or declined without auto-changing the order',()=>{
 const route=read('app/api/admin/order-service-requests/route.ts')
 const ui=read('components/admin/OrderServiceRequestQueue.tsx')
 assert.match(route,/hasStaffPermission/)
 assert.match(route,/\['handled','declined'\]/)
 assert.match(route,/orderChangeRequest\.update/)
 assert.doesNotMatch(route,/prisma\.order\.update/)
 assert.match(ui,/Nothing changes automatically/)
 assert.match(ui,/Open full order/)
 assert.match(ui,/Mark handled/)
})

test('My Order page supports verification, current order summary and request history',()=>{
 const page=read('app/(public)/my-order/page.tsx')
 assert.match(page,/Email me a verification code/)
 assert.match(page,/6-digit verification code/)
 assert.match(page,/Current rentals/)
 assert.match(page,/Request an order change/)
 assert.match(page,/Your recent requests/)
 assert.match(page,/Submitting a request does not automatically change your order or price/)
})

test('admin dashboard surfaces verified customer requests',()=>{
 const dashboard=read('app/admin/page.tsx')
 assert.match(dashboard,/OrderServiceRequestQueue/)
})

test('schema contains verification and auditable order-change models',()=>{
 const schema=read('prisma/schema.prisma')
 assert.match(schema,/model AssistantOrderVerification \{/)
 assert.match(schema,/model OrderChangeRequest \{/)
 assert.match(schema,/changeRequests OrderChangeRequest\[\]/)
 assert.match(schema,/@@index\(\[orderId, status, createdAt\]\)/)
})

test('NYC assistant directs existing-order customers to secure My Order',()=>{
 const route=read('app/api/chat-assistant/route.ts')
 assert.match(route,/secure My Order page at \/my-order/)
})
