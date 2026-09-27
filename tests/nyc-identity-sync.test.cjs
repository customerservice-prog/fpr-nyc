const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const read=p=>fs.readFileSync(p,'utf8')

test('NYC seed and business defaults identify the standalone New York location',()=>{
  const schema=read('prisma/schema.prisma')
  const seed=read('prisma/seed.js')
  assert.ok(schema.includes('businessName String @default("Friendly Party Rental NYC")'))
  assert.ok(seed.includes("businessName: 'Friendly Party Rental NYC'"))
  assert.ok(seed.includes("city: 'Riverdale'"))
  assert.ok(seed.includes("state: 'NY'"))
  assert.ok(seed.includes("zip: '10471'"))
  assert.ok(seed.includes("address: ''"))
  assert.ok(seed.includes("timeZone: 'America/New_York'"))
})

test('NYC customer-facing identity uses NYC modules and brand',()=>{
  const files=[
    'lib/nycEmail.ts','lib/homeContent.ts','lib/nycPublicCopy.ts','lib/marketing/message.ts',
    'app/admin/login/page.tsx','components/admin/AdminNav.tsx','app/admin/website/page.tsx',
    'app/(public)/[slug]/page.tsx','app/(public)/pay/[id]/page.tsx',
    'components/public/PlanningEstimator.tsx','app/admin/orders/[id]/page.tsx',
  ]
  for(const file of files){
    const text=read(file)
    assert.ok(text.includes('Friendly Party Rental NYC') || text.includes('NYC / Downstate') || text.includes('Riverdale'),file+' should contain NYC location identity')
  }
  const seo=read('lib/nycSeo.ts')
  assert.ok(seo.includes("siteName:'Friendly Party Rental NYC'"))
})

test('NYC environment template keeps paid ads off and uses the NYC sender label',()=>{
  const env=read('.env.example')
  const delivery=read('lib/marketing/delivery.ts')
  assert.ok(env.includes('EMAIL_FROM=Friendly Party Rental NYC <customerservice@friendlypartyrental.com>'))
  assert.ok(env.includes('NEXT_PUBLIC_SITE_URL=https://fpr-nyc-production.up.railway.app'))
  assert.ok(env.includes('PUBLIC_INDEXABLE=false'))
  assert.doesNotMatch(env,/NEXT_PUBLIC_NYC_GOOGLE_ADS_/)
  assert.ok(delivery.includes('Friendly Party Rental NYC <${user}>'))
})

test('legal card authorization remains tied to Friendly Party Rental L.L.C.',()=>{
  const card=read('lib/cardAuthorization.ts')
  assert.ok(card.includes('I authorize Friendly Party Rental L.L.C.'))
})

test('all NYC admin order and address entry defaults are New York',()=>{
  const main=read('app/admin/orders/new/page.tsx')
  const single=read('app/admin/orders/new/single-page/page.tsx')
  const restrictions=read('app/admin/do-not-rent/page.tsx')
  const serviceArea=read('app/api/admin/service-areas/route.ts')
  const company=read('app/admin/settings/company-info/page.tsx')
  const draft=read('app/api/checkout/draft/route.ts')
  const orders=read('app/api/orders/route.ts')
  for(const source of [main,single]){
    assert.ok(source.includes("billingState: 'NY'"))
    assert.ok(source.includes("eventState: 'NY'"))
    assert.doesNotMatch(source,/billingState: 'SC'|eventState: 'SC'/)
  }
  assert.ok(restrictions.includes("useState('NY')"))
  assert.ok(restrictions.includes("setState('NY')"))
  assert.ok(serviceArea.includes("state: body.state || 'NY'"))
  assert.ok(company.includes("state: 'NY'"))
  assert.ok(company.includes("placeholder: 'NY'"))
  assert.ok(draft.includes("|| 'NY'"))
  assert.ok(orders.includes("eventState: eventState || 'NY'"))
})

test('NYC checkout stays delivery-only',()=>{
  const checkout=read('app/(public)/checkout/page.tsx')
  const delivery=read('lib/delivery.ts')
  assert.ok(checkout.includes("setValue('deliveryType', 'delivery')"))
  assert.ok(delivery.includes('Friendly Party Rental NYC offers delivery only'))
  assert.doesNotMatch(delivery,/Greenville|South Carolina/)
})

test('legacy Syracuse ERS maintenance routes remain disabled in NYC',()=>{
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
  for(const file of legacyRoutes){
    const source=read(file)
    assert.ok(source.includes('Legacy New York ERS maintenance is disabled in the Downstate New York app.'),file)
    assert.ok(source.includes('{ status: 410 }'),file)
    assert.ok(!source.includes('prisma.'),file+' must not mutate the NYC database')
  }
})

test('active NYC app code does not import SC location modules',()=>{
  const roots=['app','components','lib']
  const stack=[...roots]
  while(stack.length){
    const p=stack.pop()
    if(!fs.existsSync(p)) continue
    const stat=fs.statSync(p)
    if(stat.isDirectory()){
      for(const name of fs.readdirSync(p)) stack.push(path.join(p,name))
      continue
    }
    if(!/\.(?:ts|tsx|js|mjs|cjs)$/.test(p)) continue
    const text=fs.readFileSync(p,'utf8')
    assert.doesNotMatch(text,/@\/lib\/sc[A-Z]/,p+' imports an SC location module')
    assert.doesNotMatch(text,/friendlypartyrentalsc\.com/i,p+' contains the SC public domain')
  }
})
