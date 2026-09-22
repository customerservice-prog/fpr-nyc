const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const read=p=>fs.readFileSync(p,'utf8')
// Discovery wave build marker: 2026-09-22
// Google profile review loop build marker

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

test('SC search revision reflects the discovery wave',()=>{
  const seo=read('lib/scSeo.ts')
  assert.ok(seo.includes("SC_SEARCH_REVISION = '2026-09-22-sc-search-v3'"))
})
