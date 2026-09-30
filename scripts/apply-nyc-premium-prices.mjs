import { PrismaClient } from '@prisma/client'
import fs from 'node:fs/promises'
import path from 'node:path'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')
const snapshotPath = path.join(process.cwd(), 'data', 'nyc-premium-price-snapshot-20260930.json')
const snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf8'))

if (snapshot.multiplier !== 1.7) throw new Error('Expected NYC premium multiplier 1.70')
if (!Array.isArray(snapshot.items) || snapshot.items.length === 0) throw new Error('NYC premium price snapshot is empty')

const changes = []
for (const row of snapshot.items) {
  const item = await prisma.item.findFirst({
    where: { slug: row.slug },
    select: { id: true, name: true, slug: true, cost: true, displayToCustomer: true },
  })
  if (!item) {
    changes.push({ slug: row.slug, status: 'missing', nycPrice: row.nycPrice })
    continue
  }
  changes.push({
    slug: row.slug,
    status: Number(item.cost) === Number(row.nycPrice) ? 'already-priced' : 'would-update',
    currentPrice: item.cost,
    nycPrice: row.nycPrice,
  })
}

console.log(JSON.stringify({ apply: APPLY, multiplier: snapshot.multiplier, source: snapshot.source, changes }, null, 2))

if (!APPLY) {
  console.log('\nDry run only. Re-run with --apply to change prices.')
  process.exit(0)
}

for (const row of snapshot.items) {
  await prisma.item.updateMany({ where: { slug: row.slug }, data: { cost: row.nycPrice } })
}

console.log('Applied NYC premium prices to matching existing items only. No items or quantities were created or changed.')
await prisma.$disconnect()
