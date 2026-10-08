const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const read=f=>fs.readFileSync(f,'utf8')

test('NYC orders store latest transactional email delivery state',()=>{
 const schema=read('prisma/schema.prisma')
 for(const field of [
  'emailDeliveryProvider String?','emailDeliveryMessageId String? @unique','emailDeliveryStatus String?',
  'emailDeliveryRecipient String?','emailDeliverySubject String?','emailDeliveryLastEvent String?',
  'emailDeliveryDetail String?','emailDeliverySentAt DateTime?','emailDeliveryUpdatedAt DateTime?',
 ]) assert.ok(schema.includes(field),'missing '+field)
})

test('NYC Resend webhook verifies a fresh Svix signature before database updates',()=>{
 const route=read('app/api/webhooks/resend/route.ts')
 assert.match(route,/RESEND_WEBHOOK_SECRET/)
 assert.match(route,/svix-id/)
 assert.match(route,/svix-timestamp/)
 assert.match(route,/svix-signature/)
 assert.match(route,/createHmac\('sha256'/)
 assert.match(route,/timingSafeEqual/)
 assert.match(route,/5 \* 60 \* 1000/)
 const raw=route.indexOf('await request.text()')
 const verify=route.indexOf('verifySignature(raw, request)')
 const update=route.indexOf('prisma.order.updateMany')
 assert.ok(raw>=0&&verify>raw&&update>verify,'signature must be verified before update')
})

test('NYC webhook records real Resend delivery outcomes',()=>{
 const route=read('app/api/webhooks/resend/route.ts')
 for(const event of ['email.sent','email.delivered','email.delivery_delayed','email.bounced','email.complained','email.failed','email.suppressed']){
  assert.ok(route.includes(event),'missing '+event)
 }
 assert.match(route,/emailDeliveryMessageId: messageId/)
 assert.match(route,/emailDeliveryUpdatedAt/)
})

test('NYC sendEmail returns provider message IDs and explicitly splits recipients',()=>{
 const email=read('lib/email.ts')
 assert.match(email,/to\.split\(','\)/)
 assert.match(email,/to: recipients/)
 assert.match(email,/messageId: delivery\.id/)
 assert.match(email,/provider: 'resend'/)
})

test('quote and receipt sends record provider state and never send a duplicate business copy',()=>{
 const route=read('app/api/admin/orders/[id]/send-quote/route.ts')
 assert.match(route,/emailDeliveryProvider/)
 assert.match(route,/emailDeliveryMessageId/)
 assert.match(route,/emailDeliveryStatus/)
 assert.match(route,/Accepted by Resend/)
 assert.doesNotMatch(route,/\[Copy\]/)
 assert.doesNotMatch(route,/companySettings\.findFirst/)
})

test('admin order shows delivered delayed and failure states with recipient detail',()=>{
 const page=read('app/admin/orders/[id]/page.tsx')
 assert.match(page,/order\.emailDeliveryStatus/)
 assert.match(page,/bounced/)
 assert.match(page,/delivered/)
 assert.match(page,/delayed/)
 assert.match(page,/Check the customer email address before sending again/)
 assert.match(page,/emailDeliveryRecipient/)
})

test('environment template documents Resend webhook signing secret',()=>{
 assert.match(read('.env.example'),/^RESEND_WEBHOOK_SECRET=$/m)
})
