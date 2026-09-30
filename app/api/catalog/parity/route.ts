export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SYRACUSE_ORIGIN, catalogParityReport, syracuseItemImageUrl, validateSyracuseCatalog } from '@/lib/nycCatalogCore.mjs'

// Read-only catalog health check: compares the live Syracuse catalog with the NYC
// database (exact quantities, NYC price rule, names, categories, visibility, copy and
// photo sources). Returns aggregate counts plus Syracuse slugs (already public data);
// hidden NYC-only rows are only counted, never listed. Cached for 60 seconds.

let cached: { at: number; body: unknown } | null = null
const CACHE_MS = 60 * 1000

export async function GET() {
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return NextResponse.json(cached.body, { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })
  }
  let syracuseItems: any[]
  try {
    const response = await fetch(SYRACUSE_ORIGIN + '/api/items', { cache: 'no-store', signal: AbortSignal.timeout(15000), headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error('HTTP ' + response.status)
    syracuseItems = validateSyracuseCatalog(await response.json())
  } catch {
    return NextResponse.json({ ok: false, error: 'Syracuse catalog unavailable right now' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }

  const [items, categories, photos] = await Promise.all([
    prisma.item.findMany({
      select: {
        slug: true, name: true, description: true, type: true, cost: true, quantity: true, displayToCustomer: true,
        scheduleProfile: true, status: true, bookableAfter: true, bookableAfterMessage: true, specialDisplayName: true,
        setupArea: true, attendants: true, ageGroup: true, colorOptions: true, taxable: true, setupFee: true,
        category: { select: { slug: true } },
      },
    }),
    prisma.category.findMany({ select: { slug: true, displayToCustomer: true } }),
    prisma.$queryRawUnsafe<Array<{ slug: string; picturePrefix: string | null; pictureLength: number; additionalCount: number }>>(
      'SELECT "slug", LEFT("picture", 400) AS "picturePrefix", COALESCE(LENGTH("picture"), 0)::int AS "pictureLength", COALESCE(array_length("additionalImages", 1), 0)::int AS "additionalCount" FROM "Item"'
    ),
  ])
  const photoBySlug = new Map(photos.map(row => [row.slug, row]))
  const noPhotoSlugs = items.filter(row => !row.displayToCustomer && Number(photoBySlug.get(row.slug)?.pictureLength || 0) === 0).map(row => row.slug)
  const report = catalogParityReport({ syracuseItems, nycItems: items, nycCategories: categories, noPhotoSlugs })
  const syracuseSlugs = new Set(syracuseItems.map(item => item.slug))
  const picturesNotFromSyracuse = items
    .filter(row => row.displayToCustomer && syracuseSlugs.has(row.slug))
    .filter(row => (photoBySlug.get(row.slug)?.picturePrefix || '') !== syracuseItemImageUrl(row.slug))
    .map(row => row.slug)
  const body = {
    ok: true,
    checkedAt: new Date().toISOString(),
    source: SYRACUSE_ORIGIN + '/api/items',
    counts: report.counts,
    mismatches: {
      missingSyracuseSlugs: report.missingSyracuseSlugs.length,
      quantity: report.quantityMismatches.length,
      price: report.priceMismatches.length,
      name: report.nameMismatches.length,
      category: report.categoryMismatches.length,
      status: report.statusMismatches.length,
      configuration: report.configMismatches.length,
      visibility: report.visibilityMismatches.length,
      publicItemsNotInSyracuse: report.publicItemsNotInSyracuse.length,
      nonPackagePricesWithCents: report.nonPackagePricesWithCents.length,
      invalidPublicPrices: report.invalidPublicPrices.length,
      customerCopy: report.customerCopyProblems.length,
      picturesNotFromSyracuse: picturesNotFromSyracuse.length,
    },
    unpublishedUntilSyracusePhoto: noPhotoSlugs.filter(slug => syracuseSlugs.has(slug)),
    details: {
      missingSyracuseSlugs: report.missingSyracuseSlugs.slice(0, 50),
      quantity: report.quantityMismatches.slice(0, 50),
      price: report.priceMismatches.slice(0, 50),
      name: report.nameMismatches.slice(0, 50),
      category: report.categoryMismatches.slice(0, 50),
      status: report.statusMismatches.slice(0, 50),
      configuration: report.configMismatches.slice(0, 50),
      visibility: report.visibilityMismatches.slice(0, 50),
      customerCopy: report.customerCopyProblems.slice(0, 50),
      picturesNotFromSyracuse: picturesNotFromSyracuse.slice(0, 50),
    },
  }
  cached = { at: Date.now(), body }
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })
}
