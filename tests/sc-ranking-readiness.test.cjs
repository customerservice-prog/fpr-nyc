const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const read=p=>fs.readFileSync(p,'utf8')
// Ranking wave build marker: 2026-09-22

test('homepage targets the core Greenville party-rental query',()=>{
  const page=read('app/(public)/page.tsx')
  const hero=read('components/public/HeroSection.tsx')
  const seo=read('components/public/ScHomeSeo.tsx')
  assert.ok(page.includes('Party Rentals in Greenville, SC | Tents, Tables, Chairs & More'))
  assert.ok(hero.includes('Party Rentals'))
  assert.ok(hero.includes('in Greenville, SC'))
  for(const heading of [
    'Tent Rentals in Greenville, SC',
    'Table &amp; Chair Rentals in Greenville, SC',
    'Bounce House &amp; Water Slide Rentals in Greenville, SC',
    'Wedding Rentals in Greenville, SC',
  ]) assert.ok(seo.includes(heading), heading)
})

test('category pages use query-focused Greenville metadata, H1s and planning depth',()=>{
  const layout=read('app/(public)/category/[slug]/layout.tsx')
  const page=read('app/(public)/category/[slug]/page.tsx')
  const client=read('app/(public)/category/[slug]/CategoryClient.tsx')
  const guide=read('components/public/CategoryPlanningGuide.tsx')
  const content=read('lib/categoryPlanningContent.ts')
  assert.ok(layout.includes('getCategoryPlanningContent'))
  assert.ok(layout.includes("'@type':'Service'"))
  assert.ok(layout.includes('SC_BUSINESS_ID'))
  assert.ok(page.includes('CategoryPlanningGuide'))
  assert.ok(client.includes('categorySearchName'))
  assert.ok(client.includes('in Greenville, SC'))
  assert.ok(guide.includes('Greenville rental planning guide'))
  for(const term of [
    'Tent Rentals in Greenville, SC | Pole & Frame Tents',
    'Table & Chair Rentals in Greenville, SC',
    'Bounce House & Water Slide Rentals in Greenville, SC',
    'Linen & Tablecloth Rentals in Greenville, SC',
    'Dance Floor & Stage Rentals in Greenville, SC',
    'Event Lighting Rentals in Greenville, SC',
    'Generator Rentals in Greenville, SC',
    'Party Rental Packages in Greenville, SC',
  ]) assert.ok(content.includes(term), term)
})

test('wedding hub targets Greenville wedding intent without indexing the package selector',()=>{
  const weddings=read('app/(public)/weddings/page.tsx')
  const selector=read('app/(public)/wedding-packages/layout.tsx')
  assert.ok(weddings.includes('Wedding Rentals in Greenville, SC | Tents, Chairs, Linens & Packages'))
  assert.ok(weddings.includes('Chiavari seating'))
  assert.ok(selector.includes(',false)'))
})

test('SC entity schema exposes the real service catalog without fabricating a street address',()=>{
  const layout=read('app/layout.tsx')
  assert.ok(layout.includes("'@type': 'LocalBusiness'"))
  assert.ok(layout.includes('hasOfferCatalog'))
  assert.ok(layout.includes("'@type': 'WebSite'"))
  assert.ok(layout.includes("addressLocality: 'Greenville'"))
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
  assert.ok(seo.includes("SC_SEARCH_REVISION = '2026-09-22-sc-search-v3'"))
  for(const bad of [
    '/tent-rentals-greenville-sc',
    '/table-chair-rentals-greenville-sc',
    '/bounce-house-rentals-greenville-sc',
    '/wedding-rentals-greenville-sc',
  ]) assert.ok(!seo.includes(bad), bad)
})
