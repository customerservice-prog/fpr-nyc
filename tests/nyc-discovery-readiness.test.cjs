const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const read=p=>fs.readFileSync(p,'utf8')

test('NYC public entity and manifest use the NYC brand without a fabricated storefront',()=>{
  const layout=read('app/layout.tsx')
  const utils=read('lib/utils.ts')
  const seo=read('lib/nycSeo.ts')
  const manifest=JSON.parse(read('public/site.webmanifest'))
  assert.ok(layout.includes("name: BUSINESS.name"))
  assert.ok(layout.includes('NYC_SERVICE_AREAS.map'))
  assert.ok(utils.includes("name: 'Friendly Party Rental NYC'"))
  assert.ok(utils.includes("legalName: 'Friendly Party Rental L.L.C.'"))
  assert.ok(seo.includes("siteName:'Friendly Party Rental NYC'"))
  assert.equal(manifest.name,'Friendly Party Rental NYC')
  assert.equal(manifest.short_name,'FPR NYC')
  assert.ok(!layout.includes('streetAddress:'))
  assert.doesNotMatch(JSON.stringify(manifest),/Greenville|South Carolina|FPR SC/i)
})

test('prelaunch crawling, sitemap and IndexNow are gated by PUBLIC_INDEXABLE',()=>{
  const robots=read('app/robots.ts')
  const sitemap=read('app/sitemap.ts')
  const helper=read('lib/nycIndexNow.ts')
  const submit=read('scripts/submit-indexnow.mjs')
  assert.ok(robots.includes('nycIndexingEnabled()'))
  assert.ok(robots.includes("disallow:'/'"))
  assert.ok(sitemap.includes('if(!nycIndexingEnabled()) return []'))
  assert.ok(helper.includes("process.env.PUBLIC_INDEXABLE==='true'"))
  assert.ok(submit.includes("process.env.PUBLIC_INDEXABLE === 'true'"))
  assert.ok(submit.includes('skipped: NYC public indexing is disabled'))
})

test('priority IndexNow list contains NYC service-area pages and no SC city routes',()=>{
  const submit=read('scripts/submit-indexnow.mjs')
  for(const route of [
    '/party-rentals-riverdale-ny',
    '/party-rentals-fieldston-ny',
    '/party-rentals-kingsbridge-ny',
    '/party-rentals-bronx-ny',
    '/party-rentals-yonkers-ny',
    '/party-rentals-mount-vernon-ny',
    '/party-rentals-new-rochelle-ny',
  ]) assert.ok(submit.includes(route),route)
  assert.doesNotMatch(submit,/party-rentals-(?:greer|simpsonville|mauldin|taylors|easley|spartanburg|anderson)-sc/)
  assert.doesNotMatch(submit,/friendlypartyrentalsc\.com/)
})

test('all NYC city pages have unique planning notes and become sitemap-eligible at launch',()=>{
  const resources=read('lib/nycLocalPlanningResources.ts')
  const serviceAreas=read('lib/nycServiceAreas.ts')
  const guide=read('components/public/CityRentalGuide.tsx')
  const sitemap=read('app/sitemap.ts')
  for(const slug of ['riverdale','fieldston','kingsbridge','bronx','yonkers','mount-vernon','new-rochelle','bronxville','tuckahoe','eastchester','pelham']){
    assert.ok(serviceAreas.includes("slug:'"+slug+"'"),slug)
    assert.ok(resources.includes(slug.includes('-')?"'"+slug+"'":slug+':'),slug+' unique planning note')
  }
  assert.ok(guide.includes('const hasLocalGuide=Boolean(NYC_LOCAL_PLANNING[slug])'))
  assert.ok(sitemap.includes("NYC_LOCAL_PLANNING[a.slug]"))
})

test('all scheduled NYC endpoint workflows use short-lived GitHub OIDC auth',()=>{
  const workflows=[
    '.github/workflows/thank-you-cron.yml',
    '.github/workflows/balance-reminder-cron.yml',
    '.github/workflows/one-year-reminder-cron.yml',
    '.github/workflows/pre-rental-reminder-cron.yml',
    '.github/workflows/pre-payment-reminders-cron.yml',
    '.github/workflows/incomplete-orders-cron.yml',
    '.github/workflows/auto-charge-cron.yml',
    '.github/workflows/check-replies-cron.yml',
    '.github/workflows/indexnow-refresh-cron.yml',
  ]
  for(const file of workflows){
    const source=read(file)
    assert.ok(source.includes('https://fpr-nyc-production.up.railway.app/api/cron/'),file)
    assert.ok(source.includes('id-token: write'),file)
    assert.ok(source.includes('audience=fpr-nyc-cron'),file)
    assert.ok(source.includes('Authorization: Bearer $OIDC_TOKEN'),file)
    assert.doesNotMatch(source,/secrets\.CRON_SECRET/,file)
    assert.doesNotMatch(source,/friendlypartyrentalsc\.com/,file)
  }

  const auth=read('lib/cronAuth.ts')
  assert.ok(auth.includes("GITHUB_OIDC_ISSUER = 'https://token.actions.githubusercontent.com'"))
  assert.ok(auth.includes("GITHUB_REPOSITORY = 'customerservice-prog/fpr-nyc'"))
  assert.ok(auth.includes("GITHUB_REF = 'refs/heads/production-nyc-live'"))
  assert.ok(auth.includes('claims.workflow_ref === expectedWorkflowRef'))
  assert.ok(auth.includes('token === legacySecret'))

  const activeRoutes={
    'app/api/cron/thank-you/route.ts':'.github/workflows/thank-you-cron.yml',
    'app/api/cron/pre-payment-reminders/route.ts':'.github/workflows/pre-payment-reminders-cron.yml',
    'app/api/cron/incomplete-orders/route.ts':'.github/workflows/incomplete-orders-cron.yml',
    'app/api/cron/auto-charge/route.ts':'.github/workflows/auto-charge-cron.yml',
    'app/api/cron/check-replies/route.ts':'.github/workflows/check-replies-cron.yml',
    'app/api/cron/indexnow/route.ts':'.github/workflows/indexnow-refresh-cron.yml',
  }
  for(const [route,workflow] of Object.entries(activeRoutes)){
    assert.ok(read(route).includes("isAuthorizedCronRequest(request, '"+workflow+"')"),route)
  }

  for(const route of [
    'app/api/cron/balance-reminder/route.ts',
    'app/api/cron/pre-rental-reminder/route.ts',
    'app/api/cron/one-year-reminder/route.ts',
  ]){
    const source=read(route)
    assert.ok(source.includes('EMERGENCY KILL SWITCH - automatic sending paused by owner request'),route)
    assert.ok(source.includes("return NextResponse.json({ disabled: true"),route)
  }
})

test('daily IndexNow refresh uses NYC searchable URLs and safely no-ops before launch',()=>{
  const helper=read('lib/nycIndexNow.ts')
  const route=read('app/api/cron/indexnow/route.ts')
  const workflow=read('.github/workflows/indexnow-refresh-cron.yml')
  assert.ok(helper.includes('currentSearchableNycUrls'))
  assert.ok(helper.includes('NYC_SERVICE_AREAS'))
  assert.ok(helper.includes('displayToCustomer:true'))
  assert.ok(helper.includes('websitePage.findMany'))
  assert.ok(helper.includes('https://api.indexnow.org/indexnow'))
  assert.ok(helper.includes('.slice(0,10000)'))
  assert.ok(route.includes('currentSearchableNycUrls'))
  assert.ok(route.includes('submitNycIndexNow'))
  assert.ok(workflow.includes('https://fpr-nyc-production.up.railway.app/api/cron/indexnow'))
})

test('NYC search revision reflects the independent full-location rebuild',()=>{
  const seo=read('lib/nycSeo.ts')
  assert.ok(seo.includes("NYC_SEARCH_REVISION='2026-09-27-nyc-full-location-v1'"))
})


test('live storefront gap fixes stay wired together',()=>{
  const rentSketch=read('lib/nycRentSketch.ts')
  const launcher=read('components/public/DesignYourEventLauncher.tsx')
  const item=read('app/(public)/items/[...slug]/page.tsx')
  const reviews=read('components/public/ReviewCarousel.tsx')
  const reviewApi=read('app/api/reviews/route.ts')
  const city=read('components/public/CityRentalGuide.tsx')
  const graduation=read('app/(public)/graduation-rentals/page.tsx')
  const vendors=read('app/(public)/wedding-vendors/page.tsx')
  const design=read('app/(public)/design-your-event/page.tsx')
  const home=read('components/public/DesktopHome.tsx')
  const homeSeo=read('components/public/NycHomeSeo.tsx')
  const relay=read('app/api/integrations/rentsketch/route.ts')

  assert.match(rentSketch,/NYC_RENTSKETCH_TENANT = 'friendly-nyc'/)
  assert.match(rentSketch,/tenant=friendly-nyc&mode=order/)
  assert.match(relay,/event_pass\.order_lookup/)
  assert.match(launcher,/inflatable-preview/)
  assert.match(item,/See This Inflatable in a Layout/)
  assert.match(item,/Frequently Added With This|SuggestedAddons/)
  assert.match(reviews,/NYC \/ Downstate customer reviews are building now/)
  assert.match(reviewApi,/NYC_GOOGLE_PLACE_ID/)
  assert.match(city,/Build a visual layout for \{area\.name\}/)
  assert.match(graduation,/Plan the space before you book/)
  assert.match(vendors,/Relish Catering \+ Hospitality/)
  assert.match(design,/Open My NYC Order Layout/)
  assert.equal((home.match(/<h1/g)||[]).length,0,'DesktopHome intro must not create a second H1')
  assert.match(homeSeo,/Linens, Concessions &amp; Event Extras/)
})
