const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')

const read=(path)=>fs.readFileSync(path,'utf8')

test('Riverdale planning pages use SC identity and published SC planning prices',()=>{
  const planning=read('lib/eventPlanning.ts')
  assert.ok(planning.includes("PLANNING_PHONE = '315-884-1498'"))
  assert.ok(planning.includes("PLANNING_ORIGIN = 'https://www.fpr-nyc-production.up.railway.app'"))
  assert.ok(planning.includes("title: 'Wedding Planning & Coordination in Riverdale, NY'"))
  for(const price of ['$1,275','$1,500','$2,075','$3,350','$5,500']) assert.ok(planning.includes(price))
  assert.ok(!planning.includes('Syracuse'))
  assert.ok(!planning.includes('315-884-1498'))
})

test('visual estimator uses SC contact and no NY planning footer',()=>{
  const source=read('components/public/PlanningEstimator.tsx')
  assert.ok(source.includes('315-884-1498'))
  assert.ok(source.includes('{NYC_PUBLIC_HOST}/event-planning'), 'printed estimate footer uses the NYC primary domain')
  assert.ok(!source.includes('friendlypartyrental.com/event-planning'))
})

test('planning inquiry capture is persistent and SC-labelled',()=>{
  const inquiry=read('lib/planningInquiry.ts')
  const route=read('app/api/event-planning/route.ts')
  assert.ok(inquiry.includes('[NYC EVENT PLANNING INQUIRY]'))
  assert.ok(inquiry.includes('Riverdale / Downstate New York'))
  assert.ok(route.includes('https://www.fpr-nyc-production.up.railway.app'))
  assert.ok(route.includes('customerservice@friendlypartyrental.com'))
  assert.ok(!route.includes('315-884-1498'))
})

test('card saving stays optional on new and existing customer payments',()=>{
  const component=read('components/public/PaymentCardAuthorization.tsx')
  const checkout=read('app/(public)/checkout/payment/page.tsx')
  const pay=read('app/(public)/pay/[id]/page.tsx')
  assert.ok(component.includes('Optional: save this card for this order'))
  assert.ok(component.includes('You can place and pay for your order without saving a card.'))
  assert.ok(checkout.includes('required={false} compact'))
  assert.ok(pay.includes('required={false} compact'))
  assert.ok(checkout.includes('useState(false)'))
  assert.ok(pay.includes('useState(false)'))
  assert.ok(pay.includes('stripePaymentId, saveCard'))
})

test('SC sitemap targets the four event-planning service pages and admin exposes inquiries',()=>{
  const seo=read('lib/scSeo.ts')
  for(const slug of ['wedding-coordination','corporate-events','private-parties','festivals-fundraisers']) assert.ok(seo.includes('/event-planning/'+slug))
  assert.ok(read('components/admin/AdminNav.tsx').includes('/admin/planning-inquiries'))
})
