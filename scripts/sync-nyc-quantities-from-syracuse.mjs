import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')
const SYRACUSE_ITEMS_URL = 'https://www.friendlypartyrental.com/api/items'

async function loadSyracuseQuantities() {
  const response = await fetch(SYRACUSE_ITEMS_URL, {
    headers: { Accept: 'application/json', 'User-Agent': 'Friendly-Party-Rental-NYC-quantity-sync/1.0' },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Unable to read Syracuse catalog: HTTP ${response.status}`)
  const payload = await response.json()
  if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
    throw new Error('Syracuse catalog returned no items')
  }

  const rows = []
  const seen = new Set()
  for (const item of payload.items) {
    const slug = typeof item?.slug === 'string' ? item.slug.trim() : ''
    const quantity = Number(item?.quantity)
    if (!slug) throw new Error('Syracuse item is missing a slug')
    if (seen.has(slug)) throw new Error('Duplicate Syracuse slug: ' + slug)
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new Error(`Invalid Syracuse quantity for ${slug}: ${item?.quantity}`)
    }
    seen.add(slug)
    rows.push({ slug, name: item.name || slug, quantity })
  }
  return rows
}

const syracuseRows = await loadSyracuseQuantities()
const nycItems = await prisma.item.findMany({
  select: { id: true, slug: true, name: true, quantity: true },
})
const nycBySlug = new Map(nycItems.map(item => [item.slug, item]))

const changes = []
for (const source of syracuseRows) {
  const nyc = nycBySlug.get(source.slug)
  if (!nyc) {
    changes.push({ slug: source.slug, name: source.name, status: 'missing-in-nyc', syracuseQuantity: source.quantity })
    continue
  }
  changes.push({
    slug: source.slug,
    name: source.name,
    status: nyc.quantity === source.quantity ? 'already-matched' : 'would-update',
    nycQuantity: nyc.quantity,
    syracuseQuantity: source.quantity,
  })
}

const missingInNyc = changes.filter(row => row.status === 'missing-in-nyc')
const mismatched = changes.filter(row => row.status === 'would-update')

console.log(JSON.stringify({
  apply: APPLY,
  source: SYRACUSE_ITEMS_URL,
  syracuseItemCount: syracuseRows.length,
  nycItemCount: nycItems.length,
  matchingItemCount: changes.length - missingInNyc.length,
  missingInNycCount: missingInNyc.length,
  quantityMismatchCount: mismatched.length,
  changes,
}, null, 2))

if (!APPLY) {
  console.log('\nDry run only. Re-run with --apply to make NYC quantities exactly match Syracuse for matching slugs.')
  await prisma.$disconnect()
  process.exit(0)
}

if (missingInNyc.length > 0) {
  await prisma.$disconnect()
  throw new Error(`Quantity sync stopped: ${missingInNyc.length} Syracuse catalog item(s) are missing in NYC. Import the complete NYC catalog first so quantities cannot silently diverge.`)
}

await prisma.$transaction(
  syracuseRows.map(row =>
    prisma.item.update({
      where: { slug: row.slug },
      data: { quantity: row.quantity },
    }),
  ),
)

console.log(`Applied Syracuse quantities to ${syracuseRows.length} NYC items exactly. Prices were not changed.`)
await prisma.$disconnect()
