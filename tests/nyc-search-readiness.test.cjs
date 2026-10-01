const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript')
function load(path,mocks={},env={},fetch=()=>{throw Error('Unexpected network request')}){
 const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,URL,Date,AbortSignal,process:{env},fetch,require(name){if(name in mocks)return mocks[name];throw Error('Unexpected import '+name)}});return module.exports
}
const policy=load('lib/nycSearchReadiness.ts')
for(const value of ['sc-domain:friendlypartyrentalnyc.com','https://friendlypartyrentalnyc.com/','https://friendlypartyrentalnyc.com'])test('accept canonical NYC Search Console property: '+value,()=>assert.ok(policy.normalizeNycSearchProperty(value)))
for(const value of [null,'','sc-domain:friendlypartyrental.com','https://www.friendlypartyrental.com/','sc-domain:friendlypartyrentalsc.com','sc-domain:rentsketch.com','sc-domain:fpr-nyc-production.up.railway.app','https://www.friendlypartyrentalnyc.com/','https://fpr-nyc-production.up.railway.app/','http://friendlypartyrentalnyc.com/','https://friendlypartyrentalnyc.com.evil.test/','https://evil.test/friendlypartyrentalnyc.com','https://name:pass@friendlypartyrentalnyc.com/','https://friendlypartyrentalnyc.com/category/','https://friendlypartyrentalnyc.com/?x=1'])test('reject unrelated/malformed property: '+value,()=>assert.equal(policy.normalizeNycSearchProperty(value),null))

test('Google OAuth request includes Calendar and Search Console read-only scopes',()=>{
 const code=fs.readFileSync('lib/googleCalendar.ts','utf8')
 assert.ok(code.includes("SEARCH_CONSOLE_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'"))
 assert.ok(code.includes("[...PROFILE_SCOPES, CALENDAR_SCOPE, SEARCH_CONSOLE_SCOPE]"))
 assert.ok(code.includes('getGoogleSearchConsoleAccessToken'))
})

test('wrong property never obtains credentials or queries Google',async()=>{
 let calls=0
 const module=load('lib/search-console.ts',{
  './nycSearchReadiness':policy,
  './google-auth':{hasGoogleCredentials(){calls++;return false},getAccessToken(){calls++;return 'fake'}},
  './googleCalendar':{getGoogleSearchConsoleAccessToken(){calls++;return {accessToken:'fake'}}},
 },{NYC_GSC_PROPERTY:'sc-domain:friendlypartyrental.com'})
 const result=await module.getSearchConsoleSummary();assert.equal(result.connected,false);assert.match(result.reason,/canonical Friendly Party Rental NYC/);assert.equal(calls,0)
})

test('missing property is reported as unconfigured, not proof of no Google traffic',async()=>{
 const module=load('lib/search-console.ts',{
  './nycSearchReadiness':policy,
  './google-auth':{hasGoogleCredentials:()=>false,getAccessToken:async()=>null},
  './googleCalendar':{getGoogleSearchConsoleAccessToken:async()=>null},
 })
 const result=await module.getSearchConsoleSummary();assert.equal(result.connected,false);assert.match(result.reason,/does not mean/)
})

test('Calendar-only Google connection asks for Search Console permission refresh',async()=>{
 const module=load('lib/search-console.ts',{
  './nycSearchReadiness':policy,
  './google-auth':{hasGoogleCredentials:()=>false,getAccessToken:async()=>null},
  './googleCalendar':{getGoogleSearchConsoleAccessToken:async()=>null},
 },{NYC_GSC_PROPERTY:'sc-domain:friendlypartyrentalnyc.com'})
 const result=await module.getSearchConsoleSummary();assert.equal(result.connected,false);assert.match(result.reason,/Reconnect the Friendly Party Rental business Google account/)
})

test('successful mock query uses existing Google OAuth and canonical NYC property',async()=>{
 const requests=[]
 const module=load('lib/search-console.ts',{
  './nycSearchReadiness':policy,
  './google-auth':{hasGoogleCredentials:()=>false,getAccessToken:async()=>{throw Error('service account should not be used')}},
  './googleCalendar':{getGoogleSearchConsoleAccessToken:async()=>({accessToken:'mock-not-secret',connection:{scope:'https://www.googleapis.com/auth/webmasters.readonly'}})},
 },{NYC_GSC_PROPERTY:'sc-domain:friendlypartyrentalnyc.com'},async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>({rows:[]})}})
 const result=await module.getSearchConsoleSummary();assert.equal(result.connected,true);assert.equal(requests.length,3)
 for(const r of requests){assert.ok(r.url.includes('sc-domain%3Afriendlypartyrentalnyc.com'));assert.ok(r.options.signal);assert.equal(r.options.cache,'no-store')}
})

test('Google 403 is reported as missing property access, not zero traffic',async()=>{
 const module=load('lib/search-console.ts',{
  './nycSearchReadiness':policy,
  './google-auth':{hasGoogleCredentials:()=>false,getAccessToken:async()=>null},
  './googleCalendar':{getGoogleSearchConsoleAccessToken:async()=>({accessToken:'mock-not-secret',connection:{}})},
 },{NYC_GSC_PROPERTY:'sc-domain:friendlypartyrentalnyc.com'},async()=>({ok:false,status:403,text:async()=> 'forbidden'}))
 const result=await module.getSearchConsoleSummary();assert.equal(result.connected,false);assert.match(result.reason,/does not have access/)
})

test('category metadata describes rentals without changing item or category names',()=>{
 assert.equal(policy.categorySearchName('tent-rentals','Tents'),'Tent Rentals');assert.equal(policy.categorySearchName('table-chair-rentals','Tables'),'Table & Chair Rentals')
 assert.ok(fs.readFileSync('app/(public)/category/[slug]/layout.tsx','utf8').includes('categorySearchName(category.slug,category.name)'))
})
test('initial fallback links existing catalog and does not fabricate availability',()=>{
 const code=fs.readFileSync('components/public/CategoryCatalogFallback.tsx','utf8');assert.ok(code.includes('isSearchableSlug(item.slug)'));assert.ok(code.includes('encodeURIComponent(item.slug!)'));assert.ok(code.includes('formatCurrency(item.cost)'));assert.ok(!code.includes('In stock'));assert.ok(!code.includes('dangerouslySetInnerHTML'))
 assert.ok(fs.readFileSync('app/(public)/category/[slug]/page.tsx','utf8').includes('createElement(CategoryCatalogFallback'))
})
test('search visibility page is admin-only, noindex and uses the shared Google permission refresh flow',()=>{
 const code=fs.readFileSync('app/admin/settings/search-visibility/page.tsx','utf8');assert.ok(code.includes('getServerSession(authOptions)'));assert.ok(code.includes("role!=='admin'"));assert.ok(code.includes('index:false'));assert.ok(!code.includes('method:'));assert.ok(code.includes('/api/admin/google-calendar/connect'))
 const settings=fs.readFileSync('app/admin/settings/google-integration/page.tsx','utf8');assert.ok(!settings.includes("isEnabled ? 'Connected'"));assert.ok(settings.includes('/admin/settings/search-visibility'))
})
