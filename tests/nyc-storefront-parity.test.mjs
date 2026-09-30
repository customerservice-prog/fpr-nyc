import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { deliveryZipFromInput } from '../lib/nycDeliveryInput.ts'
import { matchesTentLighting } from '../lib/nycAddonMatching.ts'
const text=p=>readFileSync(p,'utf8')
for(const [input,expected] of [['29601','29601'],['29601-1234','29601'],['200 E Broad Street, Riverdale, NY 29601','29601'],['12345 Main St, Riverdale NY',null],['Riverdale NY',null],['29601 invalid',null],['Greer SC 29650 USA','29650']])test('delivery input '+input,()=>assert.equal(deliveryZipFromInput(input),expected))
for(const [tent,addon,expected] of [['20x20 Pole Tent','Tent Lighting (20x20)',true],['20 x 30 Frame Tent','Tent Lighting (20x30)',true],['20x20 Pole Tent','Tent Lighting (20x30)',false],['20x20 Sidewall','Tent Lighting (20x20)',false],['Wedding Package 20x20 Tent','Tent Lighting (20x20)',false]])test('lighting '+tent+' / '+addon,()=>assert.equal(matchesTentLighting(tent,addon),expected))
test('mobile uses complete categories with date first and no product carousels',()=>{const s=text('components/public/MobileHome.tsx');assert.match(s,/\[order,\.\.\.categories\.filter/);assert.doesNotMatch(s,/RentalRow|overflow-x-auto|mobile-hero-event-scene-v4\.png/);assert.ok(s.indexOf('data-home-section="youtube"')<s.indexOf('data-home-section="categories"'));assert.match(s,/StorefrontDesigner/);assert.match(s,/items=\{pkg.items/ )})
test('hero uses clean local event image with separate visible buttons',()=>{const s=text('components/public/HeroSection.tsx');assert.match(s,/sc-event-reception.jpg/);assert.doesNotMatch(s,/wedding-backyard-elopement|Syracuse/);assert.match(s,/CHECK MY DATE/);assert.match(s,/BROWSE RENTALS/)})
test('desktop category count no longer truncates grid',()=>{assert.doesNotMatch(text('app/(public)/page.tsx'),/PUBLIC_CATEGORIES\.slice/);assert.match(text('components/public/Header.tsx'),/navLinks.some\(link => link.href === '\/design-your-event'\)/)})
test('SC integration stays disabled until server-side order-or-paid access exists',()=>{const policy=text('lib/scRentSketch.ts');assert.doesNotMatch(text('components/public/DesignYourEventLauncher.tsx'),/set\('tenant','friendly'\)/);assert.match(policy,/NYC_RENTSKETCH_TENANT: string \| null = null/);assert.match(policy,/order-or-paid/);assert.doesNotMatch(policy,/NEXT_PUBLIC_RENTSKETCH_NYC_TENANT/)})
test('gallery keeps honest attribution and another location\'s reviews are never shown',()=>{assert.match(text('app/(public)/gallery/page.tsx'),/Not every photo is from a Riverdale event/);assert.match(text('components/public/ReviewCarousel.tsx'),/if \(!reviews\.length\) return null/);assert.doesNotMatch(text('components/public/ReviewCarousel.tsx'),/friendlypartyrental\.com/);assert.ok(existsSync('public/images/shared-gallery/brand-1.jpg'))})
test('NYC package price comes only from the published catalog item while canonical package artwork matches NY without cropping',()=>{const packages=text('lib/wedding-packages.ts'),card=text('components/public/WeddingPackageCard.tsx'),detail=text('app/(public)/wedding-packages/page.tsx');assert.match(packages,/price: approvedPrice \?\? null/);assert.doesNotMatch(packages,/: p\.price/);assert.match(packages,/NYC_WEDDING_IMAGES\[p.id\]/);assert.match(card,/object-contain bg-gray-50/);assert.doesNotMatch(card,/illustrative event setting|included equipment and price below define this Riverdale package/);assert.match(detail,/w-full h-auto object-contain bg-gray-50/);assert.doesNotMatch(detail,/max-h-\[520px\] object-cover/)})
test('existing delivery/payment protections remain present',()=>{assert.match(text('app/api/orders/route.ts'),/requireMatchingDeliveryFee\(deliveryFee, deliveryQuote\)/);assert.match(text('app/(public)/checkout/payment/page.tsx'),/if \(!totalsReady\)/);assert.match(text('lib/delivery-session.ts'),/migrateDeliveryOnlySession/)})
test('local category and video assets exist',()=>{assert.ok(existsSync('public/images/categories/restroom-rentals.jpg'));assert.ok(existsSync('public/images/sc-12x12-dance-floor.jpg'));assert.ok(existsSync('public/videos/event-design-walkthrough-v2.mp4'))})

test('homepage uses one responsive shell with the newer dedicated desktop composition',()=>{
 const page=text('app/(public)/page.tsx'),responsive=text('components/public/ResponsiveHome.tsx'),desktop=text('components/public/DesktopHome.tsx'),mobile=text('components/public/MobileHome.tsx')
 assert.match(page,/ResponsiveHome/)
 assert.doesNotMatch(page,/md:hidden|hidden md:block|PlanningShortcuts|WeddingPackageCard/)
 assert.match(page,/initialHomeDevice/)
 assert.match(responsive,/window\.matchMedia\('\(min-width: 768px\)'\)/)
 assert.match(responsive,/DesktopHome/)
 assert.match(desktop,/Riverdale/)
 assert.match(desktop,/HomeCategoryGrid/)
 assert.match(desktop,/StorefrontDesigner/)
 assert.match(desktop,/WeddingPackageCard/)
 assert.match(mobile,/export interface MobileHomeProps/)
})
