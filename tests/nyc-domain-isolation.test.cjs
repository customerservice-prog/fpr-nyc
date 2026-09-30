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

test('shared media is labeled and NYC RentSketch access stays disabled',()=>{
  // Another location's reviews are never shown on the NYC site (hidden until NYC reviews exist).
  const reviews=fs.readFileSync('components/public/ReviewCarousel.tsx','utf8')
  assert.ok(!reviews.includes('friendlypartyrental.com'))
  assert.match(reviews,/if \(!reviews\.length\) return null/)
  const media=fs.readFileSync('lib/nyMediaSnapshot.json','utf8')
  assert.ok(media.includes('friendlypartyrental.com'))
  // Test the actual NYC module, not the removed SC source it was forked from.
  const rentSketch=fs.readFileSync('lib/nycRentSketch.ts','utf8')
  assert.match(rentSketch,/NYC_RENTSKETCH_TENANT: string \| null = null/)
  assert.match(rentSketch,/nycOrderAccessUrl: string \| null = null/)
  assert.doesNotMatch(rentSketch,/NEXT_PUBLIC_RENTSKETCH_NYC_TENANT/)
})
