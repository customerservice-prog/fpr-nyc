// Railway pre-deploy step 1: mirror the live Syracuse catalog into NYC.
//   node scripts/sync-nyc-catalog-from-syracuse.mjs            (dry run)
//   node scripts/sync-nyc-catalog-from-syracuse.mjs --apply    (write + verify)
// Add --strict (or NYC_CATALOG_SYNC_STRICT=true) to fail when Syracuse is unreachable.
// Rules: lib/nycCatalogCore.mjs. Engine and safety notes: scripts/nyc-catalog-sync-engine.mjs.
import { PrismaClient } from '@prisma/client'
import { SourceUnavailableError, resolveSourceOrigin, runCatalogSync } from './nyc-catalog-sync-engine.mjs'

const APPLY = process.argv.includes('--apply')
const STRICT = process.argv.includes('--strict') || process.env.NYC_CATALOG_SYNC_STRICT === 'true'
const prisma = new PrismaClient()

try {
  const result = await runCatalogSync({ prisma, apply: APPLY, origin: resolveSourceOrigin() })
  console.log(result.applied
    ? '[nyc-catalog-sync] NYC catalog mirrors Syracuse: 0 missing slugs, 0 quantity/price/field mismatches.'
    : '[nyc-catalog-sync] Dry run only. Re-run with --apply to write the changes above.')
} catch (error) {
  if (error instanceof SourceUnavailableError && !STRICT) {
    console.warn('[nyc-catalog-sync] SKIPPED: ' + error.message + '. The current NYC catalog was left unchanged.')
  } else {
    console.error('[nyc-catalog-sync] FAILED: ' + (error && error.message ? error.message : String(error)))
    process.exitCode = 1
  }
} finally {
  await prisma.$disconnect()
}
