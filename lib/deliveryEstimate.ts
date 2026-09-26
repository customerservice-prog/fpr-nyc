/** Checkout prices delivery by ZIP; never infer a street-level driving quote. */
export function extractDeliveryZip(address: string): string | null {
  const match = address.trim().match(/(?:^|[\s,])(\d{5})(?:-\d{4})?(?:\s*,?\s*(?:US|USA|United States(?: of America)?))?\s*$/i)
  return match?.[1] ?? null
}

/** Accept only a single public ZIP from a local service-area link. */
export function deliveryZipFromSearch(search: string): string | null {
  const values = new URLSearchParams(search).getAll('zip')
  if (values.length !== 1) return null
  const zip = values[0].trim()
  return /^\d{5}$/.test(zip) ? zip : null
}

export interface DeliveryEstimate {
  zip: string
  fee: number
  distance: number | null
  needsConfirmation: boolean
}

export async function fetchDeliveryEstimate(
  zip: string,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<DeliveryEstimate> {
  if (!/^\d{5}$/.test(zip)) throw new Error('Enter a valid 5-digit ZIP code.')
  // Use the exact endpoint used by checkout. The street address stays in the form.
  const response = await fetcher(`/api/delivery-fee?zip=${encodeURIComponent(zip)}`, { signal, cache: 'no-store' })
  const data = await response.json().catch(() => null)
  if (!response.ok || data?.error) {
    throw new Error(typeof data?.error === 'string' ? data.error : 'We could not check this ZIP code. Please try again.')
  }
  if (typeof data?.fee !== 'number' || !Number.isFinite(data.fee) || data.fee < 0) {
    throw new Error('We could not confirm a delivery fee. Please try again or contact us.')
  }
  const distance = typeof data.distance === 'number' && Number.isFinite(data.distance) && data.distance >= 0 ? data.distance : null
  return { zip, fee: data.fee, distance, needsConfirmation: distance !== null && distance > 100 }
}
