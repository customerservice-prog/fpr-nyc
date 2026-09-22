const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const read=p=>fs.readFileSync(p,'utf8')

test('SC local-rank endpoint is authenticated, Greenville-centered and refuses fake rankings without a provider',()=>{
 const route=read('app/api/admin/local-rank/route.ts')
 assert.match(route,/getServerSession\(authOptions\)/)
 assert.match(route,/34\.8526/)
 assert.match(route,/-82\.3940/)
 assert.match(route,/SERPAPI_KEY is not configured/)
 assert.match(route,/No rankings were guessed or simulated/)
 assert.match(route,/AbortSignal\.timeout\(12000\)/)
 assert.doesNotMatch(route,/43\.0767|-76\.0008|Syracuse/)
})

test('SC SEO analytics exposes a truthful Greenville GeoGrid readiness panel',()=>{
 const grid=read('app/admin/analytics/LocalRankGrid.tsx')
 const seo=read('app/admin/analytics/SeoTab.tsx')
 assert.match(grid,/Greenville GeoGrid/)
 assert.match(grid,/not a warehouse address/)
 assert.match(grid,/No simulated, estimated or placeholder rankings/)
 assert.match(seo,/LocalRankGrid/)
})
