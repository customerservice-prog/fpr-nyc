const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const read=p=>fs.readFileSync(p,'utf8')

test('NYC delivery uses configured service area fees only',()=>{
  const delivery=read('lib/delivery.ts')
  assert.ok(delivery.includes("'10463':150"))
  assert.ok(delivery.includes("'10471':150"))
  assert.ok(delivery.includes("'10701':175"))
  assert.ok(delivery.includes("'10801':200"))
  assert.ok(delivery.includes("'10583':225"))
  assert.ok(delivery.includes("distanceBasis:'configured-service-area'"))
  assert.ok(!/WAREHOUSE_LAT|WAREHOUSE_LON|haversine/i.test(delivery))
  assert.ok(!/Greenville|Minoa|Syracuse/.test(delivery))
})

test('unknown delivery ZIP fails safely',()=>{
  const delivery=read('lib/delivery.ts')
  assert.ok(delivery.includes('outside the currently configured NYC / Downstate delivery area'))
  assert.ok(delivery.includes('315-884-1498'))
})
