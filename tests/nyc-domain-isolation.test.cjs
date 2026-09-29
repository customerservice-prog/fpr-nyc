const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')

const SC='https://www.fpr-nyc-production.up.railway.app'
const NY='https://www.friendlypartyrental.com'

test('NYC runtime URLs never fall back to the NY storefront',()=>{
  const runtime=[
    'app/admin/marketing/campaigns/page.tsx',
    'app/api/admin/orders/[id]/send-quote/route.ts',
    'app/admin/settings/responsive-editor/page.tsx',
  ]
  for(const file of runtime){
    const source=fs.readFileSync(file,'utf8')
    assert.ok(!source.includes(NY), file+' still contains the NY storefront origin')
  }
  // The NYC primary domain is the shared origin for campaign previews and emails.
  const origin=fs.readFileSync('lib/nycPublicOrigin.ts','utf8')
  assert.ok(origin.includes("NYC_PRIMARY_ORIGIN = 'https://friendlypartyrentalnyc.com'"))
  assert.ok(fs.readFileSync('app/admin/marketing/campaigns/page.tsx','utf8').includes('NYC_PUBLIC_ORIGIN'))
  assert.ok(fs.readFileSync('app/api/admin/orders/[id]/send-quote/route.ts','utf8').includes(SC))
  assert.ok(fs.readFileSync('app/admin/settings/responsive-editor/page.tsx','utf8').includes('src="/"'))
})

test('SC deployment documentation uses the SC public base URL',()=>{
  const imageDoc=fs.readFileSync('IMAGE_HOSTING.md','utf8')
  assert.ok(imageDoc.includes('PUBLIC_BASE_URL'))
  assert.ok(imageDoc.includes(SC))
  assert.ok(!imageDoc.includes(NY))
  const wordpress=fs.readFileSync('app/admin/settings/wordpress-setup/page.tsx','utf8')
  assert.ok(wordpress.includes('fpr-nyc-production.up.railway.app'))
  assert.ok(!wordpress.includes('friendlypartyrental.com)'))
})

test('intentional shared NY evidence remains explicitly isolated',()=>{
  const reviews=fs.readFileSync('components/public/ReviewCarousel.tsx','utf8')
  assert.ok(reviews.includes('Reviews from Our New York Customers'))
  const media=fs.readFileSync('lib/nyMediaSnapshot.json','utf8')
  assert.ok(media.includes('friendlypartyrental.com'))
  const rentSketch=fs.readFileSync('lib/scRentSketch.ts','utf8')
  assert.match(rentSketch,/NYC_RENTSKETCH_TENANT: string \| null = null/)
  assert.match(rentSketch,/order-or-paid/)
  assert.doesNotMatch(rentSketch,/NEXT_PUBLIC_RENTSKETCH_NYC_TENANT/)
})
