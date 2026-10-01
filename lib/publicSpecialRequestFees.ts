export type PublicSpecialRequestFee = {
  name: string
}

export function isLegacySchedulingSpecialRequestFee(name: string): boolean {
  const normalized = (name || '').trim().toLowerCase().replace(/\s+/g, ' ')
  if (!normalized || normalized.includes('overnight')) return false
  return /\b(exact|delivery|pickup)\b/.test(normalized)
}

export function filterPublicCheckoutFees<T extends PublicSpecialRequestFee>(
  fees: T[],
  options: { hasBounceItem: boolean; hasTablesTentsItem: boolean }
): T[] {
  return fees.filter((fee) => {
    const normalized = (fee.name || '').trim().toLowerCase()
    if (isLegacySchedulingSpecialRequestFee(normalized)) return false
    if (normalized.includes('overnight')) return options.hasBounceItem
    return options.hasTablesTentsItem
  })
}
