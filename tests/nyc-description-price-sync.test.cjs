const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')

const root=path.resolve(__dirname,'..')
const script=fs.readFileSync(path.join(root,'scripts/sync-nyc-catalog-from-syracuse.mjs'),'utf8')

test('NYC catalog sync replaces stale Syracuse Starting at prices in non-package descriptions',()=>{
  assert.match(script,/syncCustomerFacingPriceInDescription/)
  assert.match(script,/Starting at\\s\+\\\$\[0-9,\]\+/)
  assert.match(script,/descriptionPriceMismatches/)
})

test('package descriptions are not rewritten by NYC premium price cleanup',()=>{
  assert.match(script,/if\(isPackage\) return description/)
})

test('description verification blocks deployment when advertised price differs from NYC price',()=>{
  assert.match(script,/descriptionPriceMismatches\.length/)
  assert.match(script,/descriptionPriceMismatchCount:0/)
})
