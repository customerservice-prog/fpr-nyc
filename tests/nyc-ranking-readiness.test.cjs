const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const read=p=>fs.readFileSync(p,'utf8')
// Ranking wave build marker: 2026-09-22

test('homepage targets the core Riverdale party-rental query',()=>{
  const page=read('app/(public)/page.tsx')
  const hero=read('components/public/HeroSection.tsx')
  const seo=read('components/public/NycHomeSeo.tsx')
  assert.ok(page.includes('Party Rentals in Riverdale, NY | Tents, Tables, Chairs & More'))
  assert.ok(hero.includes('Party Rentals'))
  assert.ok(hero.includes('in Riverdale, NY'))
  for(const heading of [
    'Tent Rentals in Riverdale, NY',
    'Table &amp; Chair Rentals in Riverdale, NY',
    'Bounce House &amp; Water Slide Rentals in Riverdale, NY',
    'Wedding Rentals in Riverdale, NY',
  ]) assert.ok(seo.includes(heading), heading)
})

test('category pages use query-focused Riverdale metadata, H1s and planning depth',()=>{
  const layout=read('app/(public)/category/[slug]/layout.tsx')
  const page=read('app/(public)/category/[slug]/page.tsx')
  const client=read('app/(public)/category/[slug]/CategoryClient.tsx')
  const guide=read('components/public/CategoryPlanningGuide.tsx')
  const content=read('lib/categoryPlanningContent.ts')
  assert.ok(layout.includes('getCategoryPlanningContent'))
  assert.ok(layout.includes("'@type':'Service'"))
  assert.ok(layout.includes('NYC_BUSINESS_ID'))
  assert.ok(page.includes('CategoryPlanningGuide'))
  assert.ok(client.includes('categorySearchName'))
  assert.ok(client.includes('in Riverdale, NY'))
  assert.ok(guide.includes('Riverdale rental planning guide'))
  for(const term of [
    'Tent Rentals in Riverdale, NY | Pole & Frame Tents',
    'Table & Chair Rentals in Riverdale, NY',
    'Bounce House & Water Slide Rentals in Riverdale, NY',
    'Linen & Tablecloth Rentals in Riverdale, NY',
    'Dance Floor & Stage Rentals in Riverdale, NY',
    'Event Lighting Rentals in Riverdale, NY',
    'Generator Rentals in Riverdale, NY',
    'Party Rental Packages in Riverdale, NY',
  ]) assert.ok(content.includes(term), term)
})

test('wedding hub targets Riverdale wedding intent without indexing the package selector',()=>{
  const weddings=read('app/(public)/weddings/page.tsx')
  const selector=read('app/(public)/wedding-packages/layout.tsx')
  assert.ok(weddings.includes('Wedding Rentals in Riverdale, NY | Tents, Chairs, Linens & Packages'))
  assert.ok(weddings.includes('Chiavari seating'))
  assert.ok(selector.includes(',false)'))
})

test('SC entity schema exposes the real service catalog without fabricating a street address',()=>{
  const layout=read('app/layout.tsx')
  assert.ok(layout.includes("'@type': 'LocalBusiness'"))
  assert.ok(layout.includes('hasOfferCatalog'))
  assert.ok(layout.includes("'@type': 'WebSite'"))
  assert.ok(layout.includes("addressLocality: 'Riverdale'"))
  assert.ok(layout.includes("addressRegion: 'SC'"))
  assert.ok(!layout.includes('streetAddress:'))
  for(const path of [
    '/category/tent-rentals',
    '/category/table-chair-rentals',
    '/category/bounce-house-rentals',
    '/weddings',
  ]) assert.ok(layout.includes(path), path)
})

test('ranking wave strengthens existing authority URLs instead of adding doorway keyword routes',()=>{
  const seo=read('lib/scSeo.ts')
  assert.ok(seo.includes("NYC_SEARCH_REVISION = '2026-09-22-sc-search-v3'"))
  for(const bad of [
    '/tent-rentals-greenville-sc',
    '/table-chair-rentals-greenville-sc',
    '/bounce-house-rentals-greenville-sc',
    '/wedding-rentals-greenville-sc',
  ]) assert.ok(!seo.includes(bad), bad)
})
