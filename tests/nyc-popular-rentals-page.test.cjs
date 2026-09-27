const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const read=p=>fs.readFileSync(p,'utf8')

test('Riverdale popular-rentals page uses the existing real booking-history engine',()=>{
 const component=read('components/public/PopularRentalsShared.tsx')
 const engine=read('lib/homepageMerchandising.ts')
 const page=read('app/(public)/popular-rentals/page.tsx')
 assert.match(component,/getHomepagePopularItems\(12\)/)
 assert.match(component,/Recent Riverdale booking history/)
 assert.match(component,/Popularity does not guarantee availability/)
 assert.match(engine,/distinct qualifying SC bookings/)
 assert.match(engine,/status:\{notIn:\['canceled','cancelled','quote','draft','incomplete'\]\}/)
 assert.match(page,/nycPageMetadata/)
})

test('popular-rentals is indexable and linked from the mobile home popular section',()=>{
 const seo=read('lib/scSeo.ts')
 const mobile=read('components/public/MobileHome.tsx')
 assert.match(seo,/\/popular-rentals/)
 assert.match(mobile,/href="\/popular-rentals"/)
 assert.match(mobile,/VIEW POPULAR RENTALS/)
})
