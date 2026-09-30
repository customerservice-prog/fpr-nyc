const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path')
const read=p=>fs.readFileSync(p,'utf8')
const PRIMARY='https://friendlypartyrentalnyc.com'
function load(filename,indexable=true){
  const cache=new Map()
  const env={NEXT_PUBLIC_SITE_URL:PRIMARY,PUBLIC_BASE_URL:PRIMARY,PUBLIC_INDEXABLE:String(indexable)}
  function moduleAt(file){
    file=path.resolve(file)
    if(cache.has(file))return cache.get(file).exports
    const module={exports:{}};cache.set(file,module)
    const localRequire=name=>name.startsWith('@/')?moduleAt(name.slice(2)+'.ts'):name.startsWith('.')?moduleAt(path.resolve(path.dirname(file),name)+'.ts'):require(name)
    vm.runInNewContext(ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:localRequire,process:{env},URL},{filename:file})
    return module.exports
  }
  return moduleAt(filename)
}
const seo=load('lib/nycSeo.ts'),areas=load('lib/nycServiceAreas.ts')
test('every public static route has its own canonical and Open Graph URL',()=>{
  for(const route of seo.NYC_STATIC_SEARCH_PATHS){
    const meta=seo.nycPageMetadata(route,'Title','Description')
    assert.equal(meta.alternates.canonical,PRIMARY+route)
    assert.equal(meta.openGraph.url,meta.alternates.canonical)
    assert.equal(meta.robots.index,true)
  }
  assert.ok(!read('app/layout.tsx').includes('canonical: SITE_URL'))
})
test('public indexing remains explicitly gated and private views remain excluded',()=>{
  const off=load('lib/nycSeo.ts',false)
  for(const route of off.NYC_STATIC_SEARCH_PATHS){
    const meta=off.nycPageMetadata(route,'Title','Description')
    assert.equal(meta.robots.index,false)
    assert.equal(meta.robots.follow,false)
  }
  for(const route of ['/checkout','/admin','/driver'])assert.equal(seo.nycPageMetadata(route,'Private','Private',false).robots.index,false)
})
test('all eleven NYC delivery communities have real local destinations',()=>{
  assert.equal(areas.NYC_SERVICE_AREAS.length,11)
  assert.equal(new Set(areas.NYC_SERVICE_AREAS.map(a=>a.href)).size,11)
  for(const area of areas.NYC_SERVICE_AREAS){
    assert.ok(fs.existsSync('app/(public)'+area.href+'/page.tsx'),area.href)
    assert.ok(area.zips.length>0)
  }
  assert.ok(read('components/public/ServiceAreaDirectory.tsx').includes('href={area.href}'))
  const guide=read('components/public/CityRentalGuide.tsx')
  assert.ok(guide.includes('provider:'))
  assert.ok(!guide.includes('streetAddress'))
  assert.ok(!guide.includes('aggregateRating'))
})
test('sitemap includes public hubs without private booking views or invented dates',()=>{
  for(const route of ['/category','/event-planning','/design-your-event','/wedding-vendors'])assert.ok(seo.NYC_STATIC_SEARCH_PATHS.includes(route))
  for(const route of ['/items','/wedding-packages','/category/weddings','/checkout'])assert.ok(!seo.NYC_STATIC_SEARCH_PATHS.includes(route))
  const source=read('app/sitemap.ts')
  assert.ok(!source.includes('new Date()'))
  assert.ok(source.includes("c.slug!=='weddings'"))
  assert.ok(source.includes('isCmsSearchPage'))
  assert.ok(source.includes('displayToCustomer:true'))
})
test('invalid slugs and unpublished or empty CMS pages cannot enter the sitemap',()=>{
  for(const value of [null,undefined,'','null','undefined','..','a/b','a?x=1','a#b','with space',' a','a\\b'])assert.equal(seo.isSearchableSlug(value),false,String(value))
  for(const value of ['20x20-tent','rental_item'])assert.equal(seo.isSearchableSlug(value),true)
  assert.equal(seo.isCmsSearchPage({slug:'venue-guide',content:'[{"type":"text","text":"A guide"}]'}),true)
  for(const page of [{slug:'checkout',content:'[{}]'},{slug:'api',content:'[{}]'},{slug:'page',content:'[]'},{slug:'page',content:'[{}]',isPublished:false}])assert.equal(seo.isCmsSearchPage(page),false)
})
test('private metadata does not noindex individual item pages once launched',()=>{
  assert.ok(!fs.existsSync('app/(public)/items/layout.tsx'))
  assert.ok(read('app/(public)/items/page.tsx').includes('false)'))
  assert.ok(read('app/(public)/items/[...slug]/page.tsx').includes('nycPageMetadata'))
  for(const file of ['app/admin/layout.tsx','app/driver/layout.tsx'])assert.ok(read(file).includes('index:false'))
})
test('rentals are not marked as universally in-stock purchases',()=>{
  const source=read('app/(public)/items/[...slug]/page.tsx')
  assert.ok(!source.includes("availability: 'https://schema.org/InStock'"))
  assert.ok(source.includes('goodrelations/v1#LeaseOut'))
  assert.ok(source.includes('displayToCustomer: true'))
})
test('only NYC www redirects and temporary Railway carts remain on their own host',async()=>{
  const config=require('../next.config.js'),redirects=await config.redirects(),headers=await config.headers()
  const hostRedirects=redirects.filter(r=>r.has?.some(h=>h.type==='host'))
  assert.deepEqual(hostRedirects.map(r=>[r.has[0].value,r.destination]),[['www.friendlypartyrentalnyc.com',PRIMARY+'/:path*'],['nyc.friendlypartyrental.com',PRIMARY+'/:path*']])
  assert.ok(redirects.filter(r=>!r.has).every(r=>r.destination.startsWith('/')&&!r.destination.startsWith('//')))
  for(const route of ['/','/category','/order-by-date'])assert.equal(seo.nycPageMetadata(route,'Title','Description').alternates.canonical,PRIMARY+route)
  for(const route of ['/checkout/:path*','/admin/:path*','/driver/:path*','/items'])assert.ok(headers.some(h=>h.source===route&&h.headers.some(v=>v.key==='X-Robots-Tag'&&v.value.includes('noindex'))))
  const robots=read('app/robots.ts')
  for(const route of ['/api/item-image/','/api/category-image/','/api/wedding-package-image/','/api/wedding-art/','/api/shared-gallery/'])assert.ok(robots.includes(route))
})
