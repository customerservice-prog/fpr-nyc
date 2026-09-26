const REPLACEMENTS: Array<[RegExp, string]> = [
  [/Syracuse,?\s*NY/gi, 'Greenville, SC'],
  [/Syracuse/gi, 'Greenville'],
  [/Minoa,?\s*NY/gi, 'Greenville, SC'],
  [/Minoa/gi, 'Greenville'],
  [/Central New York/gi, 'Upstate South Carolina'],
  [/\bCNY\b/g, 'Upstate SC'],
  [/Onondaga County/gi, 'Greenville County'],
  [/315[-.\s]?884[-.\s]?1498/g, '864-610-5324'],
]

/**
 * SC inventory/category records originated from the original NY catalog.
 * Keep the underlying shared item data intact, but never expose stale NY
 * location copy on the Greenville storefront.
 */
export function localizeScPublicCopy(value?: string | null): string {
  let text = (value || '').trim()
  for (const [pattern, replacement] of REPLACEMENTS) text = text.replace(pattern, replacement)
  return text
}

export function itemDescriptionForSc(name: string, value?: string | null): string {
  const localized = localizeScPublicCopy(value)
  if (localized) return localized
  return `Rent the ${name} from Friendly Party Rental SC for events in Greenville, SC and surrounding Upstate South Carolina communities. Check your date online for current availability and pricing.`
}

export function categoryDescriptionForSc(name: string, value?: string | null): string {
  const localized = localizeScPublicCopy(value)
  if (localized) return localized
  return `${name} for weddings, birthdays, graduations, corporate events, and backyard celebrations throughout Greenville and Upstate South Carolina.`
}
