const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const read=p=>fs.readFileSync(p,'utf8')
// Discovery wave build marker: 2026-09-22
// Google profile review loop build marker
// City quality build marker

test('SC public entity matches the live Google profile name while preserving legal name',()=>{
  const layout=read('app/layout.tsx')
  const utils=read('lib/utils.ts')
  const seo=read('lib/scSeo.ts')
  const manifest=read('public/site.webmanifest')
  assert.ok(layout.includes("name: 'Friendly Party Rental SC'"))
  assert.ok(layout.includes("legalName: 'Friendly Party Rental L.L.C.'"))
  assert.ok(layout.includes("applicationName: 'Friendly Party Rental SC'"))
  assert.ok(layout.includes("siteName: 'Friendly Party Rental SC'"))
  assert.ok(utils.includes("name: 'Friendly Party Rental SC'"))
  assert.ok(utils.includes("legalName: 'Friendly Party Rental L.L.C.'"))
  assert.ok(seo.includes("siteName:'Friendly Party Rental SC'"))
  assert.equal(JSON.parse(manifest).name,'Friendly Party Rental SC')
  assert.ok(!layout.includes('streetAddress:'))
})

test('IndexNow verification and priority submission are wired into deploys',()=>{
  const key='280513066d2053b20e0a73c4926f3109'
  const keyFile=read('public/'+key+'.txt').trim()
  const script=read('scripts/submit-indexnow.mjs')
  const docker=read('Dockerfile')
  const railway=read('railway.toml')
  const pkg=JSON.parse(read('package.json'))
  assert.equal(keyFile,key)
  assert.ok(script.includes("https://api.indexnow.org/indexnow"))
  assert.ok(script.includes("www.friendlypartyrentalsc.com"))
  for(const path of [
    '/category/tent-rentals',
    '/category/table-chair-rentals',
    '/category/bounce-house-rentals',
    '/weddings',
    '/service-area',
    '/party-rentals-greer-sc',
  ]) assert.ok(script.includes(path),path)
  assert.equal(pkg.scripts['indexnow:priority'],'node scripts/submit-indexnow.mjs')
  assert.ok(docker.includes('scripts/submit-indexnow.mjs'))
  assert.ok(railway.includes('scripts/submit-indexnow.mjs'))
})

test('Railway-generated hostname redirects to the canonical SC domain',()=>{
  const config=read('next.config.js')
  assert.ok(config.includes("friendly-party-rental-greenville-sc-production.up.railway.app"))
  assert.ok(config.includes("https://www.friendlypartyrentalsc.com/:path*"))
  assert.ok(config.includes("permanent: true"))
})


test('SC Google profile is linked consistently and review requests stay location-safe',()=>{
  const cid='14184978817653836417'
  const profile='https://www.google.com/maps?cid='+cid
  const layout=read('app/layout.tsx')
  const utils=read('lib/utils.ts')
  const email=read('lib/email.ts')
  const contact=read('app/(public)/contact_us/page.tsx')
  assert.ok(utils.includes(profile))
  assert.ok(layout.includes("hasMap: GOOGLE_PROFILE_URL"))
  assert.ok(layout.includes("sameAs: [GOOGLE_PROFILE_URL]"))
  assert.ok(email.includes('BUSINESS.googleProfile'))
  assert.ok(email.includes('honest Google review'))
  assert.ok(email.includes('positive or critical'))
  assert.ok(email.includes('from: { name: BUSINESS.name'))
  assert.ok(contact.includes('BUSINESS.googleProfile'))
  assert.ok(contact.includes('View Friendly Party Rental SC on Google'))
  assert.ok(!email.includes('friendlypartyrental.com/#reviews'))
})


test('only substantive priority city guides are indexable and submitted in the sitemap',()=>{
  const resources=read('lib/scLocalPlanningResources.ts')
  const serviceAreas=read('lib/scServiceAreas.ts')
  const guide=read('components/public/CityRentalGuide.tsx')
  const sitemap=read('app/sitemap.ts')
  const priority=['greer','simpsonville','mauldin','easley','travelers-rest','taylors','anderson','spartanburg']
  for(const slug of priority){
    assert.ok(resources.includes('"'+slug+'":'),slug+' local planning resource')
    assert.ok(serviceAreas.includes("'"+slug+"'"),slug+' priority area')
  }
  assert.ok(guide.includes('const hasLocalGuide=Boolean(SC_LOCAL_PLANNING[slug])'))
  assert.ok(guide.includes('hasLocalGuide)}'))
  assert.ok(guide.includes('Friendly Party Rental SC'))
  assert.ok(sitemap.includes("SC_LOCAL_PLANNING[a.slug]"))
  assert.ok(sitemap.includes("a.href!=='/'&&SC_LOCAL_PLANNING[a.slug]"))
  for(const thin of ['belton','central','gray-court','honea-path','six-mile']){
    assert.ok(!resources.includes('"'+thin+'":'),thin+' should stay non-indexable until unique local value exists')
  }
})

test('all SC cron workflows use the canonical host and required CRON_SECRET auth',()=>{
  const workflows=[
    '.github/workflows/thank-you-cron.yml',
    '.github/workflows/balance-reminder-cron.yml',
    '.github/workflows/one-year-reminder-cron.yml',
    '.github/workflows/pre-rental-reminder-cron.yml',
    '.github/workflows/pre-payment-reminders-cron.yml',
    '.github/workflows/incomplete-orders-cron.yml',
    '.github/workflows/auto-charge-cron.yml',
    '.github/workflows/check-replies-cron.yml',
  ]
  for(const path of workflows){
    const source=read(path)
    assert.ok(source.includes('https://www.friendlypartyrentalsc.com/api/cron/'),path+' canonical host')
    assert.ok(!source.includes('https://friendlypartyrentalsc.com/api/cron/'),path+' non-www host removed')
    assert.ok(source.includes('Authorization: Bearer ${{ secrets.CRON_SECRET }}'),path+' auth header')
    assert.ok(source.includes('run: |\n          curl'),path+' valid multiline run block')
  }
  const thankYouRoute=read('app/api/cron/thank-you/route.ts')
  assert.ok(thankYouRoute.includes('authHeader !== `Bearer ${process.env.CRON_SECRET}`'))
})

test('SC search revision reflects the discovery wave',()=>{
  const seo=read('lib/scSeo.ts')
  assert.ok(seo.includes("SC_SEARCH_REVISION = '2026-09-22-sc-search-v3'"))
})
