const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')

const SC='https://www.friendlypartyrentalsc.com'
const NY='https://www.friendlypartyrental.com'

test('SC runtime URLs never fall back to the NY storefront',()=>{
  const runtime=[
    'app/admin/marketing/campaigns/page.tsx',
    'app/api/admin/orders/[id]/send-quote/route.ts',
    'app/admin/settings/responsive-editor/page.tsx',
  ]
  for(const file of runtime){
    const source=fs.readFileSync(file,'utf8')
    assert.ok(!source.includes(NY), file+' still contains the NY storefront origin')
    assert.ok(source.includes(SC), file+' must contain the SC storefront origin')
  }
})

test('SC deployment documentation uses the SC public base URL',()=>{
  const imageDoc=fs.readFileSync('IMAGE_HOSTING.md','utf8')
  assert.ok(imageDoc.includes('PUBLIC_BASE_URL'))
  assert.ok(imageDoc.includes(SC))
  assert.ok(!imageDoc.includes(NY))
  const wordpress=fs.readFileSync('app/admin/settings/wordpress-setup/page.tsx','utf8')
  assert.ok(wordpress.includes('friendlypartyrentalsc.com'))
  assert.ok(!wordpress.includes('friendlypartyrental.com)'))
})

test('intentional shared NY evidence remains explicitly isolated',()=>{
  const reviews=fs.readFileSync('components/public/ReviewCarousel.tsx','utf8')
  assert.ok(reviews.includes('Reviews from Our New York Customers'))
  const media=fs.readFileSync('lib/nyMediaSnapshot.json','utf8')
  assert.ok(media.includes('friendlypartyrental.com'))
  const rentSketch=fs.readFileSync('lib/scRentSketch.ts','utf8')
  assert.ok(rentSketch.includes("configured!=='friendly'?configured:null"))
})
