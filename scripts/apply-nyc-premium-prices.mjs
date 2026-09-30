// Railway pre-deploy step 2: NYC prices from the LIVE Syracuse catalog.
//   - packages (name/slug/category contains "package"): exactly the Syracuse price
//   - everything else: cleanNycPrice(Syracuse price x 1.70) -> no customer-facing cents
// Dry run by default; --apply writes only Item.cost for matching slugs, then verifies.
// Syracuse unreachable: prices are left unchanged (use --strict to fail instead).
import { PrismaClient } from '@prisma/client'
import { isPackageItem, nycPriceForSyracuseItem } from '../lib/nycCatalogCore.mjs'
import { SourceUnavailableError, loadSyracuseCatalog, resolveSourceOrigin } from './nyc-catalog-sync-engine.mjs'

const APPLY = process.argv.includes('--apply')
const STRICT = process.argv.includes('--strict') || process.env.NYC_CATALOG_SYNC_STRICT === 'true'
const prisma = new PrismaClient()

async function main() {
  const syracuseItems = await loadSyracuseCatalog({ origin: resolveSourceOrigin() })
  const expected = new Map(syracuseItems.map((item) => [item.slug, { price: nycPriceForSyracuseItem(item), isPackage: isPackageItem(item), syracusePrice: Number(item.cost) }]))
  const rows = await prisma.item.findMany({ where: { slug: { in: [...expected.keys()] } }, select: { slug: true, cost: true } })
  const changes = rows
    .filter((row) => Math.round(Number(row.cost) * 100) !== Math.round(expected.get(row.slug).price * 100))
    .map((row) => ({ slug: row.slug, currentPrice: row.cost, nycPrice: expected.get(row.slug).price, syracusePrice: expected.get(row.slug).syracusePrice, package: expected.get(row.slug).isPackage }))
  console.log(JSON.stringify({
    apply: APPLY,
    multiplier: 1.7,
    pricing: 'packages unchanged from Syracuse; every other item = clean whole-dollar Syracuse x 1.70',
    syracuseItems: syracuseItems.length,
    matchedNycItems: rows.length,
    packages: [...expected.values()].filter((row) => row.isPackage).length,
    nonPackages: [...expected.values()].filter((row) => !row.isPackage).length,
    changes,
  }, null, 2))
  if (!APPLY) {
    console.log('Dry run only. Re-run with --apply to change prices.')
    return
  }
  if (changes.length) {
    await prisma.$transaction(changes.map((change) => prisma.item.update({ where: { slug: change.slug }, data: { cost: change.nycPrice } })))
  }
  const after = await prisma.item.findMany({ where: { slug: { in: [...expected.keys()] } }, select: { slug: true, cost: true } })
  const mismatches = after.filter((row) => Math.round(Number(row.cost) * 100) !== Math.round(expected.get(row.slug).price * 100)).map((row) => row.slug)
  const cents = after.filter((row) => !expected.get(row.slug).isPackage && !Number.isInteger(Math.round(Number(row.cost) * 100) / 100)).map((row) => row.slug)
  const invalid = after.filter((row) => !(Number(row.cost) > 0)).map((row) => row.slug)
  console.log(JSON.stringify({ step: 'verified', updated: changes.length, priceMismatches: mismatches.length, nonPackagePricesWithCents: cents.length, zeroOrInvalidPrices: invalid.length }))
  if (mismatches.length || cents.length || invalid.length) {
    throw new Error('NYC price verification failed: ' + JSON.stringify({ mismatches, cents, invalid }))
  }
}

try {
  await main()
} catch (error) {
  if (error instanceof SourceUnavailableError && !STRICT) {
    console.warn('[nyc-prices] SKIPPED: ' + error.message + '. NYC prices were left unchanged.')
  } else {
    console.error('[nyc-prices] FAILED: ' + (error && error.message ? error.message : String(error)))
    process.exitCode = 1
  }
} finally {
  await prisma.$disconnect()
}
