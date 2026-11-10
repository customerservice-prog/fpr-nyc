// Physical inventory confirmations are independent of Syracuse's catalog sync.
// A staff-marked unavailable item can never be sold or advertised as available.
// Confirmed quantities also cap the public catalog stock; an unverified item
// retains its existing catalog quantity until an operator establishes its source.
// No verification row is ever inferred from a copied catalog quantity.
export type NycPhysicalStockRecord = {
  status: string
  verifiedQuantity: number
  source?: string | null
  verifiedAt?: Date | string | null
}

export function effectiveNycStockQuantity(catalogQuantity: number, record?: NycPhysicalStockRecord | null): number {
  const listed = Number.isSafeInteger(catalogQuantity) && catalogQuantity > 0 ? catalogQuantity : 0
  if (!record) return listed
  if (record.status === 'unavailable') return 0
  if (record.status === 'confirmed' &&
      (record.source === 'nyc_stock' || record.source === 'partner_committed') &&
      record.verifiedAt &&
      Number.isSafeInteger(record.verifiedQuantity) && record.verifiedQuantity > 0) {
    return Math.min(listed, record.verifiedQuantity)
  }
  return listed
}
