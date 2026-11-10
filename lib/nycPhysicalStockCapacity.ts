// Physical inventory confirmations are independent of Syracuse's catalog sync.
// A staff-marked unavailable item can never be sold or advertised as available.
// Only an explicit, timestamped NYC stock or supplier commitment allows online
// rental availability. Syracuse catalog quantities are never proof of NYC stock.
// Unverified items can still be browsed and quoted manually by staff.
export type NycPhysicalStockRecord = {
  status: string
  verifiedQuantity: number
  source?: string | null
  verifiedAt?: Date | string | null
}

export function effectiveNycStockQuantity(catalogQuantity: number, record?: NycPhysicalStockRecord | null): number {
  const listed = Number.isSafeInteger(catalogQuantity) && catalogQuantity > 0 ? catalogQuantity : 0
  // Fail closed: neither a missing record nor an unverified status can authorize
  // collecting a deposit for equipment whose NYC fulfillment is not confirmed.
  if (!record || record.status !== 'confirmed') return 0
  if (record.status === 'confirmed' &&
      (record.source === 'nyc_stock' || record.source === 'partner_committed') &&
      record.verifiedAt &&
      Number.isSafeInteger(record.verifiedQuantity) && record.verifiedQuantity > 0) {
    return Math.min(listed, record.verifiedQuantity)
  }
  return 0
}
