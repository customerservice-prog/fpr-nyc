const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const read=p=>fs.readFileSync(p,'utf8')
test('NYC business identity is correct',()=>{
 const u=read('lib/utils.ts')
 assert.match(u,/name: 'Friendly Party Rental NYC'/)
 assert.match(u,/phone: '315-884-1498'/)
 assert.match(u,/address: 'Riverdale, Bronx, NY'/)
 assert.match(u,/serviceArea: 'Riverdale, the Bronx & Lower Westchester'/)
})
test('NYC SEO uses temporary fallback and indexing gate',()=>{
 const s=read('lib/nycSeo.ts')
 assert.match(s,/NYC_SITE_URL/)
 assert.match(s,/fpr-nyc-production\.up\.railway\.app/)
 assert.match(s,/PUBLIC_INDEXABLE/)
 assert.match(s,/nycPageMetadata/)
 assert.match(s,/NYC_BUSINESS_ID/)
})
test('delivery uses Riverdale pricing reference without warehouse claim',()=>{
 const d=read('lib/delivery.ts')
 assert.match(d,/PRICING_REFERENCE_ZIP = '10471'/)
 assert.match(d,/NOT a warehouse or storefront/)
 assert.doesNotMatch(d,/Greenville/i)
})
test('seed is NYC Downstate scaffold',()=>{
 const s=read('prisma/seed.js')
 for(const value of ['Riverdale','10471','Yonkers','10701','Mount Vernon','New Rochelle','Friendly Party Rental NYC','315-884-1498','INITIAL CATALOG SCAFFOLD']){
 assert.ok(s.includes(value),value)
 }
})
test('core files contain no SC customer identity (excluding regex patterns)',()=>{
 const files=['lib/nycSeo.ts','lib/utils.ts','lib/nycEmail.ts','lib/delivery.ts','prisma/seed.js']
 const bad=/Greenville|South Carolina|Upstate SC|Upstate South Carolina|friendlypartyrentalsc\.com|864[-.\s]?610[-.\s]?5324/i
 for(const file of files) assert.doesNotMatch(read(file),bad,file)
})
test('nycPublicCopy replacement patterns are NYC-focused',()=>{
 const p=read('lib/nycPublicCopy.ts')
 assert.match(p,/\[\/Greenville\/gi, 'Riverdale'\]/)
 assert.match(p,/\[\/South Carolina\/gi, 'Downstate New York'\]/)
 assert.match(p,/315-884-1498/)
})
