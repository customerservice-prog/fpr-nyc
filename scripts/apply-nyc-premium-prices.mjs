import { PrismaClient } from '@prisma/client'
import fs from 'node:fs/promises'
import path from 'node:path'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')
const snapshotPath = path.join(process.cwd(), 'data', 'nyc-premium-price-snapshot-20260930.json')
const snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf8'))

if (snapshot.multiplier !== 1.7) throw new Error('Expected NYC premium multiplier 1.70')
if (!Array.isArray(snapshot.items) || snapshot.items.length === 0) throw new Error('NYC premium price snapshot is empty')

// Keep prices visually clean for customers. The 1.70 calculation remains the source
// baseline, but NYC never publishes awkward cent values.
//
// Rules:
// - exact whole-dollar 1.70 results stay unchanged
// - under $10: round UP to the next whole dollar
// - $10-$99.99: nearest whole dollar
// - $100-$499.99: nearest $5
// - $500-$999.99: nearest $10
// - $1,000+: nearest $25
export function cleanNycPrice(raw) {
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) throw new Error('Invalid NYC price: ' + raw)
  if (Number.isInteger(value)) return value
  if (value < 10) return Math.ceil(value)
  if (value < 100) return Math.round(value)
  if (value < 500) return Math.round(value / 5) * 5
  if (value < 1000) return Math.round(value / 10) * 10
  return Math.round(value / 25) * 25
}

const changes = []
for (const row of snapshot.items) {
  const cleanPrice = cleanNycPrice(row.nycPrice)
  const item = await prisma.item.findFirst({
    where: { slug: row.slug },
    select: { id: true, name: true, slug: true, cost: true, displayToCustomer: true },
  })
  if (!item) {
    changes.push({ slug: row.slug, status: 'missing', calculated70PercentPrice: row.nycPrice, nycPrice: cleanPrice })
    continue
  }
  changes.push({
    slug: row.slug,
    status: Number(item.cost) === cleanPrice ? 'already-priced' : 'would-update',
    currentPrice: item.cost,
    calculated70PercentPrice: row.nycPrice,
    nycPrice: cleanPrice,
  })
}

console.log(JSON.stringify({
  apply: APPLY,
  multiplier: snapshot.multiplier,
  pricingPresentation: 'clean whole-dollar premium pricing; no customer-facing cents',
  source: snapshot.source,
  changes,
}, null, 2))

if (!APPLY) {
  console.log('\nDry run only. Re-run with --apply to change prices.')
  process.exit(0)
}

for (const row of snapshot.items) {
  const cleanPrice = cleanNycPrice(row.nycPrice)
  await prisma.item.updateMany({ where: { slug: row.slug }, data: { cost: cleanPrice } })
}

console.log('Applied clean NYC premium prices to matching existing items only. No packages, items, or quantities were created or changed.')
await prisma.$disconnect()
