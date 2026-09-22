const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript')
const read=p=>fs.readFileSync(p,'utf8')
function load(path){const module={exports:{}};vm.runInNewContext(ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require});return module.exports}
const seo=load('lib/scSeo.ts'),areas=load('lib/scServiceAreas.ts')
test('every public static route has its own canonical and Open Graph URL',()=>{
 for(const path of seo.SC_STATIC_SEARCH_PATHS){const meta=seo.scPageMetadata(path,'Title','Description');assert.equal(meta.alternates.canonical,seo.SC_SITE_URL+path);assert.equal(meta.openGraph.url,meta.alternates.canonical);assert.equal(meta.robots.index,true)}
 assert.ok(!read('app/layout.tsx').includes('canonical: SITE_URL'))
})
test('all 35 communities have crawlable destinations without fictitious storefronts',()=>{
 assert.equal(areas.SC_SERVICE_AREAS.length,35);assert.equal(new Set(areas.SC_SERVICE_AREAS.map(a=>a.href)).size,35)
 for(const area of areas.SC_SERVICE_AREAS.filter(a=>a.href!=='/'))assert.ok(fs.existsSync('app/(public)'+area.href+'/page.tsx'))
 assert.ok(read('components/public/ServiceAreaDirectory.tsx').includes('href={area.href}'))
 const guide=read('components/public/CityRentalGuide.tsx');assert.ok(guide.includes('provider:'));assert.ok(!guide.includes('streetAddress'));assert.ok(!guide.includes('aggregateRating'))
})
test('sitemap includes public hubs without noindex booking views or invented dates',()=>{
 for(const path of ['/category','/event-planning','/design-your-event','/wedding-vendors'])assert.ok(seo.SC_STATIC_SEARCH_PATHS.includes(path))
 for(const path of ['/items','/wedding-packages','/category/weddings','/checkout'])assert.ok(!seo.SC_STATIC_SEARCH_PATHS.includes(path))
 const s=read('app/sitemap.ts');assert.ok(!s.includes('new Date()'));assert.ok(s.includes("c.slug!=='weddings'"));assert.ok(s.includes('isCmsSearchPage'));assert.ok(s.includes('displayToCustomer:true'))
})
test('invalid slugs and unpublished or empty CMS pages cannot enter the sitemap',()=>{
 for(const v of [null,undefined,'','null','undefined','..','a/b','a?x=1','a#b','with space',' a','a\\b'])assert.equal(seo.isSearchableSlug(v),false,String(v))
 for(const v of ['20x20-tent','rental_item'])assert.equal(seo.isSearchableSlug(v),true)
 assert.equal(seo.isCmsSearchPage({slug:'venue-guide',content:'[{"type":"text","text":"A guide"}]'}),true)
 for(const p of [{slug:'checkout',content:'[{}]'},{slug:'api',content:'[{}]'},{slug:'page',content:'[]'},{slug:'page',content:'[{}]',isPublished:false}])assert.equal(seo.isCmsSearchPage(p),false)
})
test('private metadata does not noindex the individual item pages',()=>{
 assert.ok(!fs.existsSync('app/(public)/items/layout.tsx'));assert.ok(read('app/(public)/items/page.tsx').includes('false)'));assert.ok(read('app/(public)/items/[...slug]/page.tsx').includes('scPageMetadata'))
 for(const p of ['app/admin/layout.tsx','app/driver/layout.tsx'])assert.ok(read(p).includes('index:false'))
})
test('rentals are not marked as universally in-stock purchases',()=>{
 const s=read('app/(public)/items/[...slug]/page.tsx');assert.ok(!s.includes("availability: 'https://schema.org/InStock'"));assert.ok(s.includes('goodrelations/v1#LeaseOut'));assert.ok(s.includes('displayToCustomer: true'))
})
test('canonical metadata consolidates search URLs without moving origin-scoped carts',async()=>{
 const config=require('../next.config.js'),redirects=await config.redirects(),headers=await config.headers()
 assert.equal(redirects.filter(r=>r.has?.some(h=>h.type==='host')).length,0)
 assert.ok(redirects.every(r=>r.destination.startsWith('/')&&!r.destination.startsWith('//')))
 for(const path of ['/','/category','/order-by-date'])assert.equal(seo.scPageMetadata(path,'Title','Description').alternates.canonical,seo.SC_SITE_URL+path)
 for(const p of ['/checkout/:path*','/admin/:path*','/driver/:path*','/items'])assert.ok(headers.some(h=>h.source===p&&h.headers[0].value.includes('noindex')))
 const s=read('app/robots.ts');for(const p of ['/api/item-image/','/api/category-image/','/api/wedding-package-image/','/api/wedding-art/','/api/shared-gallery/'])assert.ok(s.includes(p))
})
