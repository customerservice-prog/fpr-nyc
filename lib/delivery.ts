export class DeliveryQuoteError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'DeliveryQuoteError'
    this.status = status
  }
}

export function normalizeDeliveryZip(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{5}(?:-\d{4})?$/.test(value.trim())) {
    throw new DeliveryQuoteError('Please enter a valid 5-digit ZIP code or ZIP+4.')
  }
  return value.trim().slice(0, 5)
}

export function requireDeliveryMethod(value: unknown): void {
  if (value != null && value !== '' && value !== 'delivery') {
    throw new DeliveryQuoteError(
      'Friendly Party Rental NYC is currently delivery-only. Customer warehouse pickup is not available.'
    )
  }
}

export interface DeliveryQuote {
  fee: number
  distance: number
  zip: string
  isEstimate: true
  distanceBasis: 'staff-confirmation-required'
}

export function requireMatchingDeliveryFee(_value: unknown, _quote: DeliveryQuote): void {
  throw new DeliveryQuoteError(
    'NYC / Downstate delivery pricing requires staff confirmation before payment. Please contact Friendly Party Rental to finalize the route and delivery fee.',
    409
  )
}

export async function getDeliveryQuote(value: unknown): Promise<DeliveryQuote> {
  const zip = normalizeDeliveryZip(value)
  throw new DeliveryQuoteError(
    `Delivery to ZIP ${zip} requires staff confirmation while the NYC / Downstate route model is being finalized. Please contact Friendly Party Rental before payment.`,
    409
  )
}
