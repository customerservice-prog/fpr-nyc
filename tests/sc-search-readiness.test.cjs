const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript')
function load(path,mocks={},env={},fetch=()=>{throw Error('Unexpected network request')}){
 const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,URL,Date,AbortSignal,process:{env},fetch,require(name){if(name in mocks)return mocks[name];throw Error('Unexpected import '+name)}});return module.exports
}
const policy=load('lib/scSearchReadiness.ts')
for(const value of ['sc-domain:friendlypartyrentalsc.com','https://www.friendlypartyrentalsc.com/','https://friendlypartyrentalsc.com'])test('accept only a real SC root property: '+value,()=>assert.ok(policy.normalizeScSearchProperty(value)))
for(const value of [null,'','sc-domain:friendlypartyrental.com','https://www.friendlypartyrental.com/','sc-domain:rentsketch.com','http://friendlypartyrentalsc.com/','https://friendlypartyrentalsc.com.evil.test/','https://evil.test/friendlypartyrentalsc.com','https://name:pass@friendlypartyrentalsc.com/','https://friendlypartyrentalsc.com/category/','https://friendlypartyrentalsc.com/?x=1'])test('reject unrelated/malformed property: '+value,()=>assert.equal(policy.normalizeScSearchProperty(value),null))
test('wrong property never obtains credentials or queries Google',async()=>{
 let calls=0
 const module=load('lib/search-console.ts',{'./scSearchReadiness':policy,'./google-auth':{hasGoogleCredentials(){calls++;return true},getAccessToken(){calls++;return 'fake'}}},{GSC_SITE_URL:'sc-domain:friendlypartyrental.com'})
 const result=await module.getSearchConsoleSummary();assert.equal(result.connected,false);assert.match(result.reason,/not Greenville search data/);assert.equal(calls,0)
})
test('missing property is reported as unconfigured, not proof of no Google traffic',async()=>{
 const module=load('lib/search-console.ts',{'./scSearchReadiness':policy,'./google-auth':{}})
 const result=await module.getSearchConsoleSummary();assert.equal(result.connected,false);assert.match(result.reason,/does not mean/)
})
test('successful mock query targets SC only with a timeout and preserves report shape',async()=>{
 const requests=[]
 const module=load('lib/search-console.ts',{'./scSearchReadiness':policy,'./google-auth':{hasGoogleCredentials:()=>true,getAccessToken:async()=> 'mock-not-secret'}},{GSC_SITE_URL:'sc-domain:friendlypartyrentalsc.com'},async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>({rows:[]})}})
 const result=await module.getSearchConsoleSummary();assert.equal(result.connected,true);assert.equal(requests.length,3)
 for(const r of requests){assert.ok(r.url.includes('sc-domain%3Afriendlypartyrentalsc.com'));assert.ok(r.options.signal);assert.equal(r.options.cache,'no-store')}
})
test('category metadata describes rentals without changing item or category names',()=>{
 assert.equal(policy.categorySearchName('tent-rentals','Tents'),'Tent Rentals');assert.equal(policy.categorySearchName('table-chair-rentals','Tables'),'Table & Chair Rentals')
 assert.ok(fs.readFileSync('app/(public)/category/[slug]/layout.tsx','utf8').includes('categorySearchName(category.slug,category.name)'))
})
test('initial fallback links existing catalog and does not fabricate availability',()=>{
 const code=fs.readFileSync('components/public/CategoryCatalogFallback.tsx','utf8');assert.ok(code.includes('isSearchableSlug(item.slug)'));assert.ok(code.includes('encodeURIComponent(item.slug!)'));assert.ok(code.includes('formatCurrency(item.cost)'));assert.ok(!code.includes('In stock'));assert.ok(!code.includes('dangerouslySetInnerHTML'))
 assert.ok(fs.readFileSync('app/(public)/category/[slug]/page.tsx','utf8').includes('createElement(CategoryCatalogFallback'))
})
test('search visibility page is admin-only, noindex and never submits to Google',()=>{
 const code=fs.readFileSync('app/admin/settings/search-visibility/page.tsx','utf8');assert.ok(code.includes('getServerSession(authOptions)'));assert.ok(code.includes("role!=='admin'"));assert.ok(code.includes('index:false'));assert.ok(!code.includes('method:'));assert.ok(!code.includes('GOOGLE_SERVICE_ACCOUNT_JSON'))
 const settings=fs.readFileSync('app/admin/settings/google-integration/page.tsx','utf8');assert.ok(!settings.includes("isEnabled ? 'Connected'"));assert.ok(settings.includes('/admin/settings/search-visibility'))
})
