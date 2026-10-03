const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const read=p=>fs.readFileSync(p,'utf8')

test('homepage targets Riverdale, Bronx and Lower Westchester party-rental intent',()=>{
  const page=read('app/(public)/page.tsx')
  const hero=read('components/public/HeroSection.tsx')
  const seo=read('components/public/NycHomeSeo.tsx')
  assert.ok(page.includes('Party Rentals | Riverdale, Bronx & Lower Westchester'))
  assert.ok(hero.includes('Party Rentals'))
  assert.ok(hero.includes('in Riverdale, the Bronx &amp; Lower Westchester'))
  for(const heading of [
    'Tent Rentals in Riverdale, NY, the Bronx & Lower Westchester',
    'Table &amp; Chair Rentals in Riverdale, the Bronx &amp; Lower Westchester',
    'Bounce House &amp; Water Slide Rentals in Riverdale, the Bronx &amp; Lower Westchester',
    'Wedding Rentals in Riverdale, the Bronx &amp; Lower Westchester',
    'Party Rentals for Bronx &amp; Lower Westchester Events',
  ]) assert.ok(seo.includes(heading), heading)
})

test('category pages target the real NYC and Lower Westchester delivery footprint',()=>{
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
  assert.ok(client.includes('in Riverdale, the Bronx & Lower Westchester'))
  assert.ok(guide.includes('Riverdale, Bronx & Lower Westchester rental planning guide'))
  for(const term of [
    'Tent Rentals | Riverdale, Bronx & Lower Westchester',
    'Table & Chair Rentals | Riverdale, Bronx & Lower Westchester',
    'Bounce House & Water Slide Rentals | Bronx & Lower Westchester',
    'Linen & Tablecloth Rentals | Bronx & Lower Westchester',
    'Dance Floor & Stage Rentals | Bronx & Lower Westchester',
    'Event Lighting Rentals | Bronx & Lower Westchester',
    'Generator Rentals | Bronx & Lower Westchester',
    'Party Rental Packages | Bronx & Lower Westchester',
  ]) assert.ok(content.includes(term), term)
})

test('wedding hub targets Riverdale wedding intent without indexing the package selector',()=>{
  const weddings=read('app/(public)/weddings/page.tsx')
  const selector=read('app/(public)/wedding-packages/layout.tsx')
  assert.ok(weddings.includes('Wedding Rentals | Riverdale, Bronx & Lower Westchester'))
  assert.ok(weddings.includes('Chiavari seating'))
  assert.ok(selector.includes(',false)'))
})

test('core organic pages connect Bronx and Lower Westchester intent without doorway URLs',()=>{
  const home=read('components/public/NycHomeSeo.tsx')
  const client=read('app/(public)/category/[slug]/CategoryClient.tsx')
  const guide=read('components/public/CategoryPlanningGuide.tsx')
  assert.ok(home.includes('Party Rentals for Bronx &amp; Lower Westchester Events'))
  assert.ok(client.includes('Delivered Across Riverdale, the Bronx & Lower Westchester'))
  assert.ok(guide.includes('selected Bronx neighborhoods and Lower Westchester'))
  assert.doesNotMatch(read('lib/nycSeo.ts'),/\/tent-rentals-bronx|\/party-rentals-yonkers-tent/)
})

test('NYC entity schema exposes the service catalog without fabricating a storefront',()=>{
  const layout=read('app/layout.tsx')
  assert.ok(layout.includes("'@type': 'LocalBusiness'"))
  assert.ok(layout.includes('hasOfferCatalog'))
  assert.ok(layout.includes("'@type': 'WebSite'"))
  assert.ok(layout.includes('NYC_SERVICE_AREAS.map'))
  assert.ok(!layout.includes('streetAddress:'))
  assert.ok(!layout.includes('addressLocality:'))
  assert.ok(!layout.includes("addressRegion: 'SC'"))
  for(const path of [
    '/category/tent-rentals',
    '/category/table-chair-rentals',
    '/category/bounce-house-rentals',
    '/weddings',
  ]) assert.ok(layout.includes(path), path)
})

test('ranking wave strengthens existing NYC authority URLs instead of adding doorway routes',()=>{
  const seo=read('lib/nycSeo.ts')
  assert.ok(seo.includes("NYC_SEARCH_REVISION='2026-10-03-local-organic-v6'"))
  for(const bad of [
    '/tent-rentals-greenville-sc',
    '/table-chair-rentals-greenville-sc',
    '/bounce-house-rentals-greenville-sc',
    '/wedding-rentals-greenville-sc',
  ]) assert.ok(!seo.includes(bad), bad)
})


test('local service-area indexing is earned by verified planning depth',()=>{
  const resources=read('lib/nycLocalPlanningResources.ts')
  const sitemap=read('app/sitemap.ts')
  const city=read('components/public/CityRentalGuide.tsx')
  for(const slug of ['riverdale','fieldston','kingsbridge','bronx','yonkers','mount-vernon','new-rochelle','bronxville','pelham']){
    assert.match(resources,new RegExp("(?:'"+slug+"'|"+slug+"):\\s*\\{"),slug)
  }
  assert.doesNotMatch(resources,/^  (?:'tuckahoe'|tuckahoe|'eastchester'|eastchester):\s*\{/m)
  assert.ok(sitemap.includes("NYC_SERVICE_AREAS.filter(a=>a.href!=='/'&&NYC_LOCAL_PLANNING[a.slug])"))
  assert.ok(city.includes('Official public planning resource'))
})


test('organic link graph connects services and verified local areas',()=>{
  const home=read('components/public/NycHomeSeo.tsx')
  const category=read('components/public/CategoryPlanningGuide.tsx')
  const city=read('components/public/CityRentalGuide.tsx')
  for(const file of [home,category]){
    assert.ok(file.includes('NYC_SERVICE_AREAS'))
    assert.ok(file.includes('NYC_LOCAL_PLANNING'))
  }
  assert.ok(home.includes('Party rentals in {area.name}, NY'))
  assert.ok(category.includes('{name} in {area.name}, NY'))
  assert.ok(city.includes('{name} in {area.name}, NY'))
  assert.ok(city.includes('Tents, Tables, Chairs & More'))
})


test('existing event-intent pages are indexable, canonical and included in sitemap',()=>{
  const sitemap=read('app/sitemap.ts')
  const servicePage=read('app/(public)/event-planning/[service]/page.tsx')
  const eventPage=read('app/(public)/event-planning/page.tsx')
  assert.ok(sitemap.includes("planningServices.forEach(service=>add('/event-planning/'+encodeURIComponent(service.slug)))"))
  assert.ok(servicePage.includes('nycPageMetadata'))
  const planningPage=read('components/public/PlanningPage.tsx')
  assert.ok(planningPage.includes("'@type': 'Service'"))
  assert.ok(planningPage.includes('NYC_BUSINESS_ID'))
  assert.ok(planningPage.includes('NYC_SERVICE_AREAS.map'))
  assert.ok(eventPage.includes('Riverdale, Bronx & Lower Westchester'))
  for(const slug of ['wedding-coordination','corporate-events','private-parties','festivals-fundraisers']){
    assert.ok(read('lib/eventPlanning.ts').includes("slug: '"+slug+"'"),slug)
  }
})


test('NYC trust copy avoids inherited longevity and reputation claims',()=>{
  const weddings=read('app/(public)/weddings/page.tsx')
  const graduation=read('app/(public)/graduation-rentals/page.tsx')
  const chiavari=read('app/(public)/chiavari-chair-rentals/page.tsx')
  for(const code of [weddings,graduation,chiavari]){
    assert.doesNotMatch(code,/10\+ Years|10\+ years/)
    assert.doesNotMatch(code,/Why Riverdale .*Choose/i)
  }
  assert.ok(weddings.includes('What Couples Can Expect'))
  assert.ok(graduation.includes('What Families Can Expect'))
})


test('NYC entity authority binds structured data to verified public identities',()=>{
  const layout=read('app/layout.tsx')
  const utils=read('lib/utils.ts')
  const footer=read('components/public/Footer.tsx')
  assert.ok(layout.includes('sameAs: ENTITY_PROFILES'))
  assert.ok(layout.includes('contactPoint'))
  assert.ok(layout.includes('knowsAbout'))
  assert.ok(utils.includes('NEXT_PUBLIC_GOOGLE_BUSINESS_PROFILE_URL'))
  assert.ok(utils.includes('NEXT_PUBLIC_GOOGLE_MAPS_URL'))
  assert.ok(footer.includes('View Friendly Party Rental NYC on Google'))
})

test('category pages publish crawlable collection schema without inherited longevity claims',()=>{
  const page=read('app/(public)/category/[slug]/page.tsx')
  assert.ok(page.includes("'@type': 'ItemList'"))
  assert.equal((page.match(/'@type': 'CollectionPage'/g)||[]).length,0)
  assert.ok(page.includes('nycItemPath(item.slug!)'))
  assert.doesNotMatch(page,/10\+ years|more than 10 years/i)
})


test('NYC review flywheel never sends an empty Google review link',()=>{
  const email=read('lib/email.ts')
  const utils=read('lib/utils.ts')
  const thankYou=read('app/api/cron/thank-you/route.ts')
  const migration=read('prisma/migrations/20260708120000_add_automatic_messages/migration.sql')
  assert.ok(utils.includes('NEXT_PUBLIC_GOOGLE_BUSINESS_PROFILE_URL'))
  assert.ok(email.includes('BUSINESS.googleProfile ?'))
  assert.ok(email.includes('Review ${BUSINESS.name} on Google'))
  assert.ok(email.includes('please reply directly to this email'))
  assert.ok(thankYou.includes("id: 'automsg_thank_you'"))
  assert.ok(migration.includes("'automsg_thank_you'"))
  assert.ok(migration.includes("'After Order Ends'"))
})

test('item offer schema covers the real NYC delivery footprint',()=>{
  const item=read('app/(public)/items/[...slug]/page.tsx')
  assert.ok(item.includes("import { NYC_SERVICE_AREAS }"))
  assert.ok(item.includes("areaServed: NYC_SERVICE_AREAS.map"))
  assert.doesNotMatch(item,/areaServed: 'Riverdale, NY'/)
})


test('NYC event planner targets useful informational intent with structured app data',()=>{
  const page=read('app/(public)/design-your-event/page.tsx')
  assert.ok(page.includes('2D & 3D Event Layout Planner | Riverdale, Bronx & Lower Westchester'))
  assert.ok(page.includes("2D &amp; 3D Event Layout Planner for Tents, Tables &amp; Chairs"))
  assert.ok(page.includes("'@type': 'WebApplication'"))
  assert.ok(page.includes("applicationCategory: 'DesignApplication'"))
  assert.ok(page.includes('NYC_BUSINESS_ID'))
  for(const path of ['/category/tent-rentals','/category/table-chair-rentals','/category/dance-floor-stage-rentals']) assert.ok(page.includes(path),path)
  const home=read('components/public/NycHomeSeo.tsx')
  assert.ok(home.includes('2D &amp; 3D Event Layout Planner'))
  assert.ok(home.includes('href="/design-your-event"'))
  assert.doesNotMatch(page,/isAccessibleForFree|price:\s*['"]?0/)
})


test('product and contact pages strengthen verified local discovery',()=>{
  const delivery=read('components/public/LocalDeliveryLinks.tsx')
  const contact=read('app/(public)/contact_us/layout.tsx')
  assert.ok(delivery.includes('NYC_LOCAL_PLANNING'))
  assert.ok(delivery.includes('Party rentals in {area.name}, NY'))
  assert.doesNotMatch(delivery,/NYC_PRIORITY_AREAS/)
  assert.ok(contact.includes('Contact Friendly Party Rental NYC | Bronx & Lower Westchester'))
  assert.ok(contact.includes("'/contact_us'"))
})
