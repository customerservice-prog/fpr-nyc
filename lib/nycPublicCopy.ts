const REPLACEMENTS: Array<[RegExp, string]> = [
  [/Friendly Party Rental SC/gi, 'Friendly Party Rental NYC'],
  [/Greenville,?\s*SC/gi, 'Riverdale, NY'],
  [/Greenville/gi, 'Riverdale'],
  [/Upstate South Carolina/gi, 'Downstate New York'],
  [/Upstate SC/gi, 'Downstate New York'],
  [/South Carolina/gi, 'Downstate New York'],
  [/Onondaga County/gi, 'the Bronx and Lower Westchester'],
  [/Greenville County/gi, 'Lower Westchester'],
  [/864[-.\\s]?610[-.\\s]?5324/g, '315-884-1498'],
]

export function localizeNycPublicCopy(value?: string | null): string {
  let text = (value || '').trim()
  for (const [pattern, replacement] of REPLACEMENTS) text = text.replace(pattern, replacement)
  return text
}

export function itemDescriptionForNyc(name: string, value?: string | null): string {
  const localized = localizeNycPublicCopy(value)
  if (localized) return localized
  return `Rent the ${name} from Friendly Party Rental NYC for events in Riverdale, the Bronx, and Lower Westchester. Check your date online for current availability and pricing.`
}

export function categoryDescriptionForNyc(name: string, value?: string | null): string {
  const localized = localizeNycPublicCopy(value)
  if (localized) return localized
  return `${name} for weddings, birthdays, graduations, corporate events, and backyard celebrations across Riverdale, the Bronx, and Lower Westchester.`
}
