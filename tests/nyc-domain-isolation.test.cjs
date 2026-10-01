const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')

const LEGACY_NYC='https://www.fpr-nyc-production.up.railway.app'
const SYRACUSE='https://www.friendlypartyrental.com'

test('NYC runtime URLs never fall back to the Syracuse storefront',()=>{
  const runtime=[
    'app/admin/marketing/campaigns/page.tsx',
    'app/api/admin/orders/[id]/send-quote/route.ts',
    'app/admin/settings/responsive-editor/page.tsx',
  ]
  for(const file of runtime){
    const source=fs.readFileSync(file,'utf8')
    assert.ok(!source.includes(SYRACUSE),file+' still contains the Syracuse storefront origin')
  }
  const origin=fs.readFileSync('lib/nycPublicOrigin.ts','utf8')
  assert.ok(origin.includes("NYC_PRIMARY_ORIGIN = 'https://friendlypartyrentalnyc.com'"))
  assert.ok(fs.readFileSync('app/admin/marketing/campaigns/page.tsx','utf8').includes('NYC_PUBLIC_ORIGIN'))
  assert.ok(fs.readFileSync('app/admin/settings/responsive-editor/page.tsx','utf8').includes('src="/"'))
})

test('legacy NYC deployment documentation does not fall back to Syracuse',()=>{
  const imageDoc=fs.readFileSync('IMAGE_HOSTING.md','utf8')
  assert.ok(imageDoc.includes('PUBLIC_BASE_URL'))
  assert.ok(imageDoc.includes(LEGACY_NYC))
  assert.ok(!imageDoc.includes(SYRACUSE))
  const wordpress=fs.readFileSync('app/admin/settings/wordpress-setup/page.tsx','utf8')
  assert.ok(wordpress.includes('fpr-nyc-production.up.railway.app'))
  assert.ok(!wordpress.includes('friendlypartyrental.com)'))
})

test('shared media and cross-location trust proof stay explicitly labeled while RentSketch is NYC-isolated',()=>{
  const reviews=fs.readFileSync('components/public/ReviewCarousel.tsx','utf8')
  assert.match(reviews,/original Syracuse-area location/)
  assert.match(reviews,/not NYC rentals/)
  assert.match(reviews,/nycReviews\.length === 0/)
  const media=fs.readFileSync('lib/nyMediaSnapshot.json','utf8')
  assert.ok(media.includes('friendlypartyrental.com'))

  const rentSketch=fs.readFileSync('lib/nycRentSketch.ts','utf8')
  assert.match(rentSketch,/NEXT_PUBLIC_NYC_RENTSKETCH_TENANT/)
  assert.match(rentSketch,/NYC_RENTSKETCH_TENANT: string \| null = configuredTenant \|\| null/)
  assert.match(rentSketch,/nycOrderAccessUrl: string \| null = null/)
  assert.doesNotMatch(rentSketch,/tenant=friendly(?:&|')/)
})
