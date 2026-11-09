// NYC-only operational readiness summary. Never infer physical stock from Syracuse catalog quantities.
export type NycStockVerification = {
  itemSlug: string
  status: string
  verifiedQuantity: number
  source: string
  verifiedAt: Date | null
}

export type NycStockReadinessSummary = {
  catalogItems: number
  confirmed: number
  unverified: number
  unavailable: number
  physicallyStaged: number
  supplierCommitted: number
}

// A verification is counted only for a currently public NYC item. Orphaned
// verification records (deleted/hidden catalog items) do not inflate coverage.
export function summarizeNycPhysicalInventory(
  publicItemSlugs: readonly string[],
  verifications: readonly NycStockVerification[],
): NycStockReadinessSummary {
  const checks = new Map(verifications.map(check => [check.itemSlug, check]))
  const slugs = new Set(publicItemSlugs)
  const summary: NycStockReadinessSummary = {
    catalogItems: slugs.size,
    confirmed: 0,
    unverified: 0,
    unavailable: 0,
    physicallyStaged: 0,
    supplierCommitted: 0,
  }

  for (const slug of slugs) {
    const verification = checks.get(slug)
    if (verification?.status === 'confirmed' &&
        Number.isSafeInteger(verification.verifiedQuantity) &&
        verification.verifiedQuantity > 0 &&
        verification.verifiedAt &&
        (verification.source === 'nyc_stock' || verification.source === 'partner_committed')) {
      summary.confirmed++
      if (verification.source === 'nyc_stock') summary.physicallyStaged++
      else summary.supplierCommitted++
    } else if (verification?.status === 'unavailable' && verification.verifiedQuantity === 0) {
      summary.unavailable++
    } else {
      summary.unverified++
    }
  }

  return summary
}
