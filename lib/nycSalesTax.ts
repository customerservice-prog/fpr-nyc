// NYC / Lower Westchester sales-tax jurisdictions for online checkout.
//
// Pure module (no Prisma / Next.js imports) so it can be unit tested and used by
// both the server pricing and the public rate endpoint.
//
// Rates: NYS Publication 718 (2/25), "New York State Sales and Use Tax Rates by
// Jurisdiction", effective March 1, 2025. It was still the current edition on
// https://www.tax.ny.gov/pubs_and_bulls/publications/sales/local_rates_current.htm
// when checked on September 29, 2026, and the locality rate-change notices list
// no later change for New York City or Westchester County. Every rate below
// includes the 3/8% Metropolitan Commuter Transportation District tax.
//
// A delivered rental is taxed at the rate of the delivery location, and ZIP codes
// do not follow municipal lines. A ZIP whose addresses can fall in more than one
// jurisdiction is therefore never priced online: the office confirms the address
// (Tax Department "Jurisdiction/Rate Lookup by Address") and books it directly.
// There is no fallback or default rate anywhere in this module.

export const NYC_SALES_TAX_SOURCE = {
  publication: 'NYS Publication 718 (2/25)',
  effectiveDate: '2025-03-01',
  url: 'https://www.tax.ny.gov/pdf/publications/sales/pub718.pdf',
  verifiedOn: '2026-09-29',
} as const

export interface SalesTaxJurisdiction {
  id: string
  name: string
  /** Combined state + local rate, in percent. */
  ratePercent: number
  /** Reporting code from Publication 718 (used on the sales tax return). */
  reportingCode: string
}

export const NYC_SALES_TAX_JURISDICTIONS: Readonly<Record<string, SalesTaxJurisdiction>> = {
  'new-york-city': { id: 'new-york-city', name: 'New York City (Bronx)', ratePercent: 8.875, reportingCode: '8081' },
  yonkers: { id: 'yonkers', name: 'Yonkers (city)', ratePercent: 8.875, reportingCode: '6511' },
  'mount-vernon': { id: 'mount-vernon', name: 'Mount Vernon (city)', ratePercent: 8.375, reportingCode: '5521' },
  'new-rochelle': { id: 'new-rochelle', name: 'New Rochelle (city)', ratePercent: 8.375, reportingCode: '6861' },
  'westchester-outside-cities': {
    id: 'westchester-outside-cities',
    name: 'Westchester County (outside the cities)',
    ratePercent: 8.375,
    reportingCode: '5581',
  },
}

/**
 * Jurisdictions that addresses in each approved NYC delivery ZIP (lib/nycServiceAreas.ts)
 * can belong to. More than one entry means the ZIP crosses a municipal line.
 */
export const NYC_ZIP_TAX_JURISDICTIONS: Readonly<Record<string, readonly string[]>> = {
  // The Bronx (New York City).
  '10463': ['new-york-city'],
  '10468': ['new-york-city'],
  '10470': ['new-york-city'],
  '10471': ['new-york-city'],
  // City of Yonkers.
  '10701': ['yonkers'],
  '10703': ['yonkers'],
  '10704': ['yonkers'],
  '10705': ['yonkers'],
  '10710': ['yonkers'],
  // City of Mount Vernon.
  '10550': ['mount-vernon'],
  '10552': ['mount-vernon'],
  '10553': ['mount-vernon'],
  // City of New Rochelle.
  '10801': ['new-rochelle'],
  '10804': ['new-rochelle'],
  '10805': ['new-rochelle'],
  // Town of Eastchester (Eastchester) and Town of Pelham.
  '10709': ['westchester-outside-cities'],
  '10803': ['westchester-outside-cities'],
  // Shared post-office ZIPs: Tuckahoe (10707) also serves Crestwood and Bronxville (10708)
  // also serves Lawrence Park West, Cedar Knolls and other sections, all in the City of Yonkers.
  '10707': ['westchester-outside-cities', 'yonkers'],
  '10708': ['westchester-outside-cities', 'yonkers'],
}

export type SalesTaxResolution =
  | { status: 'resolved'; zip: string; ratePercent: number; jurisdiction: SalesTaxJurisdiction }
  | { status: 'needs_address_review'; zip: string; candidates: SalesTaxJurisdiction[] }
  | { status: 'unknown_zip'; zip: string | null }

export function normalizeTaxZip(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const match = /^(\d{5})(?:-\d{4})?$/.exec(value.trim())
  return match ? match[1] : null
}

/** Resolves the sales-tax rate for a delivery ZIP. Never guesses: ambiguous or unknown ZIPs are not resolved. */
export function resolveNycSalesTax(zipValue: unknown): SalesTaxResolution {
  const zip = normalizeTaxZip(zipValue)
  if (!zip) return { status: 'unknown_zip', zip: null }
  const ids = NYC_ZIP_TAX_JURISDICTIONS[zip]
  if (!ids || ids.length === 0) return { status: 'unknown_zip', zip }
  const candidates = ids.map((id) => NYC_SALES_TAX_JURISDICTIONS[id]).filter((entry): entry is SalesTaxJurisdiction => !!entry)
  if (candidates.length !== ids.length) return { status: 'unknown_zip', zip }
  if (candidates.length > 1) return { status: 'needs_address_review', zip, candidates }
  const [jurisdiction] = candidates
  if (!Number.isFinite(jurisdiction.ratePercent) || jurisdiction.ratePercent <= 0 || jurisdiction.ratePercent >= 20) {
    return { status: 'unknown_zip', zip }
  }
  return { status: 'resolved', zip, ratePercent: jurisdiction.ratePercent, jurisdiction }
}

/** Customer-facing explanation when a ZIP cannot be priced online. */
export function salesTaxUnavailableMessage(resolution: SalesTaxResolution, phone: string): string {
  if (resolution.status === 'needs_address_review') {
    const names = resolution.candidates.map((candidate) => candidate.name).join(' or ')
    return 'Sales tax for ZIP ' + resolution.zip + ' depends on whether the address is in ' + names + '. Please call ' + phone + ' so we can confirm your address and book your order.'
  }
  return 'Sales tax for this delivery ZIP has not been set up for online checkout. Please call ' + phone + ' to book.'
}

/** Formats a percentage without rounding away NY's eighth-of-a-percent rates (8.875 -> "8.875%"). */
export function formatTaxRatePercent(rate: unknown): string {
  const value = typeof rate === 'number' ? rate : Number(rate)
  if (!Number.isFinite(value)) return ''
  return String(Math.round(value * 1000) / 1000) + '%'
}
