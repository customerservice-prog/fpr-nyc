const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const read=p=>fs.readFileSync(p,'utf8')

test('NYC database defaults and seed identity are isolated',()=>{
  const schema=read('prisma/schema.prisma')
  const seed=read('prisma/seed.js')
  const migration=read('prisma/migrations/20260926210000_nyc_identity_sync/migration.sql')
  assert.ok(schema.includes('businessName String @default("Friendly Party Rental NYC")'))
  assert.ok(schema.includes('state String @default("NY")'))
  assert.ok(seed.includes("businessName: 'Friendly Party Rental NYC'"))
  assert.ok(seed.includes("phone: '315-884-1498'"))
  assert.ok(seed.includes("city: 'Riverdale'"))
  assert.ok(seed.includes("state: 'NY'"))
  assert.ok(migration.includes("SET DEFAULT 'Friendly Party Rental NYC'"))
  assert.ok(migration.includes("SET DEFAULT 'NY'"))
})

test('active NYC identity does not regress to SC public branding',()=>{
  const files=['lib/scEmail.ts','lib/scPublicCopy.ts','lib/scSeo.ts','lib/scServiceAreas.ts','app/layout.tsx','components/public/ScHomeSeo.tsx']
  const text=files.map(read).join('\n')
  assert.ok(text.includes('Friendly Party Rental NYC'))
  assert.ok(text.includes('315-884-1498'))
  assert.ok(!text.includes('864-610-5324'))
  assert.ok(!text.includes('friendlypartyrentalsc.com'))
})
