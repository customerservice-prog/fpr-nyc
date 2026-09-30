// Customer-facing NYC copy for catalog text inherited from the Syracuse store.
// The rules live in lib/nycCatalogCore.mjs, shared with the catalog sync that
// stores already-localized descriptions; applying them again here is idempotent and
// protects any path that still reads older rows.
import { localizeNycCatalogText } from './nycCatalogCore.mjs'

/**
 * Removes wrong-market wording (Syracuse / Central New York) and, when `price` is
 * given, rewrites "Starting at $X/day" to the NYC price. Without a price, inherited
 * price sentences are dropped instead of showing another store's price.
 */
export function localizeNycPublicCopy(value?: string | null, price?: number | null): string {
  return localizeNycCatalogText(value || '', { price: typeof price === 'number' ? price : null })
}

export function itemDescriptionForNyc(name: string, value?: string | null, price?: number | null): string {
  const localized = localizeNycPublicCopy(value, price)
  if (localized) return localized
  return `Rent the ${name} from Friendly Party Rental NYC for events in Riverdale, selected Bronx neighborhoods, and Lower Westchester. Check your date online for current availability and pricing.`
}

export function categoryDescriptionForNyc(name: string, value?: string | null): string {
  const localized = localizeNycPublicCopy(value)
  if (localized) return localized
  return `${name} for weddings, birthdays, graduations, corporate events, and backyard celebrations across our NYC / Lower Westchester delivery area.`
}
