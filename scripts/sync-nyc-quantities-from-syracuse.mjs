// Railway pre-deploy step 3: NYC quantities match the LIVE Syracuse catalog exactly,
// item-for-item by slug (owner decision 2026-09-30: if Syracuse has 893 chairs,
// NYC has 893). Dry run by default; --apply writes only Item.quantity, then verifies.
// A Syracuse slug missing in NYC is an error (the catalog sync creates every slug).
// Syracuse unreachable: quantities are left unchanged (use --strict to fail instead).
import { PrismaClient } from '@prisma/client'
import { SourceUnavailableError, loadSyracuseCatalog, resolveSourceOrigin } from './nyc-catalog-sync-engine.mjs'

const APPLY = process.argv.includes('--apply')
const STRICT = process.argv.includes('--strict') || process.env.NYC_CATALOG_SYNC_STRICT === 'true'
const prisma = new PrismaClient()

async function main() {
  const syracuseItems = await loadSyracuseCatalog({ origin: resolveSourceOrigin() })
  const expected = new Map(syracuseItems.map((item) => [item.slug, Number(item.quantity)]))
  const rows = await prisma.item.findMany({ where: { slug: { in: [...expected.keys()] } }, select: { slug: true, quantity: true } })
  const found = new Set(rows.map((row) => row.slug))
  const missingInNyc = [...expected.keys()].filter((slug) => !found.has(slug))
  const changes = rows
    .filter((row) => row.quantity !== expected.get(row.slug))
    .map((row) => ({ slug: row.slug, nycQuantity: row.quantity, syracuseQuantity: expected.get(row.slug) }))
  console.log(JSON.stringify({ apply: APPLY, syracuseItems: syracuseItems.length, matchedNycItems: rows.length, missingInNyc, quantityChanges: changes }, null, 2))
  if (missingInNyc.length) throw new Error(missingInNyc.length + ' Syracuse slug(s) missing in NYC: ' + missingInNyc.join(', '))
  if (!APPLY) {
    console.log('Dry run only. Re-run with --apply to make NYC quantities exactly match Syracuse.')
    return
  }
  if (changes.length) {
    await prisma.$transaction(changes.map((change) => prisma.item.update({ where: { slug: change.slug }, data: { quantity: change.syracuseQuantity } })))
  }
  const after = await prisma.item.findMany({ where: { slug: { in: [...expected.keys()] } }, select: { slug: true, quantity: true } })
  const mismatches = after.filter((row) => row.quantity !== expected.get(row.slug)).map((row) => row.slug)
  console.log(JSON.stringify({ step: 'verified', updated: changes.length, quantityMismatches: mismatches.length, missingSyracuseSlugs: expected.size - after.length }))
  if (mismatches.length || after.length !== expected.size) throw new Error('NYC quantity verification failed: ' + mismatches.join(', '))
}

try {
  await main()
} catch (error) {
  if (error instanceof SourceUnavailableError && !STRICT) {
    console.warn('[nyc-quantities] SKIPPED: ' + error.message + '. NYC quantities were left unchanged.')
  } else {
    console.error('[nyc-quantities] FAILED: ' + (error && error.message ? error.message : String(error)))
    process.exitCode = 1
  }
} finally {
  await prisma.$disconnect()
}
