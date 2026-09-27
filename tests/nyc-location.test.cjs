const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const read=p=>fs.readFileSync(p,'utf8')

test('focused NYC service areas are configured',()=>{
  const areas=read('lib/scServiceAreas.ts')
  for(const name of ['Riverdale','Fieldston','Kingsbridge','Yonkers','Mount Vernon','New Rochelle','Bronxville','Tuckahoe','Eastchester','Pelham','Scarsdale','Larchmont','Mamaroneck']) assert.ok(areas.includes(name),name)
  for(const zip of ['10463','10471','10701','10550','10801','10708','10707','10709','10803','10583','10538','10543']) assert.ok(areas.includes(zip),zip)
  assert.ok(!areas.includes('Greenville'))
})

test('NYC local full-app routes exist',()=>{
  const routes=['fieldston','kingsbridge','yonkers','mount-vernon','new-rochelle','bronxville','tuckahoe','eastchester','pelham','scarsdale','larchmont','mamaroneck']
  for(const slug of routes){
    const p='app/(public)/party-rentals-'+slug+'-ny/page.tsx'
    assert.ok(fs.existsSync(p),p)
  }
})

test('search indexing remains gated until explicit launch',()=>{
  const seo=read('lib/scSeo.ts')
  assert.ok(seo.includes("process.env.PUBLIC_INDEXABLE==='true'"))
  assert.ok(seo.includes('NYC_PUBLIC_INDEXABLE'))
})
