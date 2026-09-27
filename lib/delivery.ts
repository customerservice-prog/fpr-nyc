/**
 * NYC Delivery: ZIP-zone-based fee lookup
 * No warehouse, no haversine distance calculation
 */

export class DeliveryQuoteError extends Error {
  constructor(
    public code: number,
    message: string
  ) {
    super(message);
    this.name = 'DeliveryQuoteError';
  }
}

/**
 * ZIP zone fee mapping
 * Each zone has a flat delivery fee
 */
const ZIP_ZONE_FEES: Record<string, number> = {
  // Riverdale primary zone
  '10463': 79.99,
  '10471': 79.99,

  // Northwest Bronx expansion
  '10467': 99.99,
  '10468': 99.99,
  '10470': 99.99,

  // Yonkers and northern Westchester
  '10701': 119.99,
  '10703': 119.99,
  '10704': 119.99,
  '10705': 119.99,
  '10707': 119.99, // Tuckahoe
  '10708': 119.99, // Bronxville
  '10709': 119.99, // Eastchester
  '10710': 119.99,

  // Mount Vernon
  '10550': 119.99,
  '10552': 119.99,
  '10553': 119.99,

  // Pelham
  '10803': 119.99,

  // New Rochelle zone (premium distance)
  '10801': 139.99,
  '10804': 139.99,
  '10805': 139.99,
};

/**
 * Normalize and validate ZIP code (5 or 9 digit)
 */
export function normalizeDeliveryZip(zip: unknown): string {
  const normalized = String(zip || '').trim().replace(/\D/g, '');
  const match = normalized.match(/^(\d{5})(?:\d{4})?$/);

  if (!match) {
    throw new DeliveryQuoteError(
      400,
      `Invalid ZIP code. Please enter a valid 5-digit ZIP. For questions, call ${getTeamPhone()}.`
    );
  }

  return match[1];
}

/**
 * Get team phone number
 */
export function getTeamPhone(): string {
  return '315-884-1498';
}

/**
 * Require delivery method (no pickup allowed)
 */
export function requireDeliveryMethod(method: unknown): 'delivery' {
  if (method !== 'delivery') {
    throw new DeliveryQuoteError(
      400,
      `Pickup is not available in our service area. We offer delivery only. Call ${getTeamPhone()} for questions.`
    );
  }
  return 'delivery';
}

/**
 * Get delivery fee for ZIP code
 */
export function getDeliveryFee(zip: string): number {
  const fee = ZIP_ZONE_FEES[zip];
  if (fee === undefined) {
    throw new DeliveryQuoteError(
      400,
      `We don't service ZIP code ${zip}. Please contact our NYC team at ${getTeamPhone()} for availability.`
    );
  }
  return fee;
}

/**
 * Delivery quote response
 */
export interface DeliveryQuote {
  fee: number;
  distance: 0;
  zip: string;
  isEstimate: false;
  distanceBasis: 'zip-zone';
}

/**
 * Calculate delivery quote
 */
export function calculateDeliveryFee(zip: string): DeliveryQuote {
  const normalized = normalizeDeliveryZip(zip);
  const fee = getDeliveryFee(normalized);

  return {
    fee,
    distance: 0,
    zip: normalized,
    isEstimate: false,
    distanceBasis: 'zip-zone',
  };
}

/**
 * Get full delivery quote
 */
export function getDeliveryQuote(opts: {
  zip: unknown;
  deliveryMethod?: unknown;
}): DeliveryQuote {
  requireDeliveryMethod(opts.deliveryMethod || 'delivery');
  return calculateDeliveryFee(String(opts.zip || ''));
}

/**
 * Require matching delivery fee
 * Validates that provided fee matches the calculated fee for the ZIP code
 */
export function requireMatchingDeliveryFee(
  zip: string,
  providedFee: number
): void {
  const quote = calculateDeliveryFee(zip);
  const tolerance = 0.01; // $0.01 rounding tolerance

  if (Math.abs(quote.fee - providedFee) > tolerance) {
    throw new DeliveryQuoteError(
      400,
      `Delivery fee mismatch for ZIP ${zip}. Expected $${quote.fee.toFixed(2)}, got $${providedFee.toFixed(2)}. Please recalculate.`
    );
  }
}

