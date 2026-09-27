const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const read=p=>fs.readFileSync(p,'utf8')
// Identity sync build marker: 2026-09-23

test('SC defaults cannot regress to NY or the old public brand',()=>{
  const schema=read('prisma/schema.prisma')
  const seed=read('prisma/seed.js')
  const migration=read('prisma/migrations/20260923213000_sc_identity_sync/migration.sql')
  assert.ok(schema.includes('businessName String @default("Friendly Party Rental NYC")'))
  assert.ok(schema.includes('state String @default("SC")'))
  assert.ok(!schema.includes('state String @default("NY")'))
  assert.ok(seed.includes("businessName: 'Friendly Party Rental NYC'"))
  assert.ok(migration.includes("SET DEFAULT 'Friendly Party Rental NYC'"))
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
    assert.ok(text.includes('Friendly Party Rental NYC'),path+' should contain SC brand')
  }
  assert.ok(read('lib/scSeo.ts').includes("alt:'Friendly Party Rental NYC'"))
})

test('SC environment and sender defaults use the SC public brand and property',()=>{
  const env=read('.env.example')
  const delivery=read('lib/marketing/delivery.ts')
  assert.ok(env.includes('EMAIL_FROM=Friendly Party Rental NYC <customerservice@friendlypartyrental.com>'))
  assert.ok(env.includes('https://fpr-nyc-production.up.railway.app/'))
  assert.ok(delivery.includes('Friendly Party Rental NYC <${user}>'))
})

test('legal authorization remains tied to Friendly Party Rental L.L.C.',()=>{
  const card=read('lib/cardAuthorization.ts')
  assert.ok(card.includes('I authorize Friendly Party Rental L.L.C.'))
})


test('SC public chat cannot regress to New York operational copy',()=>{
  const chat=read('components/public/ChatWidget.tsx')
  assert.ok(chat.includes('Friendly Party Rental NYC assistant'))
  assert.ok(chat.includes('Applicable taxes are calculated automatically at checkout based on your order and event location.'))
  assert.ok(chat.includes('Riverdale currently operates as a delivery-only service.'))
  for(const forbidden of ['New York State sales tax','315-884-1498','Syracuse','Minoa']){
    assert.ok(!chat.includes(forbidden),forbidden+' must not appear in the Riverdale customer chat')
  }
})


test('SC runtime defaults and legacy maintenance stay isolated from New York',()=>{
  const order=read('app/admin/orders/new/page.tsx')
  const single=read('app/admin/orders/new/single-page/page.tsx')
  const restrictions=read('app/admin/do-not-rent/page.tsx')
  const serviceArea=read('app/api/admin/service-areas/route.ts')
  const company=read('app/admin/settings/company-info/page.tsx')
  const seed=read('prisma/seed.js')
  const checkout=read('app/(public)/checkout/page.tsx')
  for(const source of [order,single]){
    assert.ok(source.includes("billingState: 'SC'"))
    assert.ok(source.includes("eventState: 'SC'"))
    assert.ok(!source.includes("billingState: 'NY'"))
    assert.ok(!source.includes("eventState: 'NY'"))
  }
  assert.ok(restrictions.includes("useState('SC')"))
  assert.ok(!restrictions.includes("setState('NY')"))
  assert.ok(serviceArea.includes("state: body.state || 'SC'"))
  assert.ok(!serviceArea.includes("state: body.state || 'NY'"))
  assert.ok(company.includes("placeholder: 'SC'"))
  assert.ok(seed.includes("state: 'SC',\n          zip: area.zip"))
  assert.ok(!seed.includes("state: 'NY',\n          zip: area.zip"))
  assert.ok(checkout.includes("setValue('deliveryType', 'delivery')"))
  assert.ok(checkout.includes('Delivery fee and sales tax are calculated on the next step based on your event address.'))
  assert.ok(!checkout.includes('No delivery fee applies to customer pickup orders.'))

  const legacyRoutes=[
    'app/api/admin/backfill-ers-emails/route.ts',
    'app/api/admin/bulk-import-ers/route.ts',
    'app/api/admin/fix-ers-dates/route.ts',
    'app/api/admin/reconcile-ers-dates/route.ts',
    'app/api/admin/fix-order-numbers/route.ts',
    'app/api/admin/fix-missing-ers-orders/route.ts',
    'app/api/admin/fix-july-data/route.ts',
    'app/api/admin/fix-batch3-special-cases/route.ts',
  ]
  for(const path of legacyRoutes){
    const source=read(path)
    assert.ok(source.includes('Legacy New York ERS maintenance is disabled in the Downstate New York app.'),path)
    assert.ok(source.includes('{ status: 410 }'),path)
    assert.ok(!source.includes('prisma.'),path+' must not mutate the SC database')
  }

  const migration=read('prisma/migrations/20260927080000_sc_runtime_isolation/migration.sql')
  assert.ok(migration.includes('UPDATE "ServiceArea"'))
  assert.ok(migration.includes('"zip" ~ \'^29[0-9]{3}$\''))
  assert.ok(migration.includes('UPDATE "RegisterSetup"'))
  assert.ok(migration.includes("'Riverdale, NY'"))
  assert.ok(migration.includes('Customer and order records are intentionally not rewritten or deleted'))
})
