const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const read=p=>fs.readFileSync(p,'utf8')
// Identity sync build marker: 2026-09-23

test('SC defaults cannot regress to NY or the old public brand',()=>{
  const schema=read('prisma/schema.prisma')
  const seed=read('prisma/seed.js')
  const migration=read('prisma/migrations/20260923213000_sc_identity_sync/migration.sql')
  assert.ok(schema.includes('businessName String @default("Friendly Party Rental SC")'))
  assert.ok(schema.includes('state String @default("SC")'))
  assert.ok(!schema.includes('state String @default("NY")'))
  assert.ok(seed.includes("businessName: 'Friendly Party Rental SC'"))
  assert.ok(migration.includes("SET DEFAULT 'Friendly Party Rental SC'"))
  assert.ok(migration.includes("SET DEFAULT 'SC'"))
  assert.ok(migration.includes('SET "state" = \'SC\''))
})

test('SC customer-facing identity is consistent across public, admin and email surfaces',()=>{
  const files=[
    'lib/scEmail.ts','lib/homeContent.ts','lib/scPublicCopy.ts','lib/marketing/message.ts',
    'app/admin/login/page.tsx','components/admin/AdminNav.tsx','app/admin/website/page.tsx',
    'app/(public)/[slug]/page.tsx','app/(public)/pay/[id]/page.tsx',
    'components/public/PlanningEstimator.tsx','app/admin/orders/[id]/page.tsx',
    'app/api/admin/generate-item-descriptions/route.ts','app/api/admin/meetings/[id]/zoom-signature/route.ts'
  ]
  for(const path of files){
    const text=read(path)
    assert.ok(text.includes('Friendly Party Rental SC'),path+' should contain SC brand')
  }
  assert.ok(read('lib/scSeo.ts').includes("alt:'Friendly Party Rental SC'"))
})

test('SC environment and sender defaults use the SC public brand and property',()=>{
  const env=read('.env.example')
  const delivery=read('lib/marketing/delivery.ts')
  assert.ok(env.includes('EMAIL_FROM=Friendly Party Rental SC <customerservice@friendlypartyrental.com>'))
  assert.ok(env.includes('sc-domain:friendlypartyrentalsc.com'))
  assert.ok(delivery.includes('Friendly Party Rental SC <${user}>'))
})

test('legal authorization remains tied to Friendly Party Rental L.L.C.',()=>{
  const card=read('lib/cardAuthorization.ts')
  assert.ok(card.includes('I authorize Friendly Party Rental L.L.C.'))
})


test('SC public chat cannot regress to New York operational copy',()=>{
  const chat=read('components/public/ChatWidget.tsx')
  assert.ok(chat.includes('Friendly Party Rental SC assistant'))
  assert.ok(chat.includes('Applicable taxes are calculated automatically at checkout based on your order and event location.'))
  assert.ok(chat.includes('Greenville currently operates as a delivery-only service.'))
  for(const forbidden of ['New York State sales tax','315-884-1498','Syracuse','Minoa']){
    assert.ok(!chat.includes(forbidden),forbidden+' must not appear in the Greenville customer chat')
  }
})
