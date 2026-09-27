const REPLACEMENTS:Array<[RegExp,string]>=[
  [/Greenville,?\s*SC/gi,'Riverdale, NY'],
  [/Greenville/gi,'NYC / Downstate'],
  [/Upstate South Carolina/gi,'Downstate New York'],
  [/Upstate SC/gi,'Downstate New York'],
  [/South Carolina/gi,'New York'],
  [/Syracuse,?\s*NY/gi,'Riverdale, NY'],
  [/Syracuse/gi,'Downstate New York'],
  [/Minoa,?\s*NY/gi,'Riverdale, NY'],
  [/Minoa/gi,'Downstate New York'],
  [/Central New York/gi,'Downstate New York'],
  [/\bCNY\b/g,'Downstate NY'],
  [/Onondaga County/gi,'Lower Westchester'],
  [/864[-.\s]?610[-.\s]?5324/g,'315-884-1498'],
]
export function localizeNycPublicCopy(value?:string|null):string{let text=(value||'').trim();for(const [p,r] of REPLACEMENTS)text=text.replace(p,r);return text}
export function itemDescriptionForNyc(name:string,value?:string|null):string{const localized=localizeNycPublicCopy(value);if(localized)return localized;return `Rent the ${name} from Friendly Party Rental NYC for events in Riverdale, selected Bronx neighborhoods, and Lower Westchester. Check your date online for current availability and pricing.`}
export function categoryDescriptionForNyc(name:string,value?:string|null):string{const localized=localizeNycPublicCopy(value);if(localized)return localized;return `${name} for weddings, birthdays, graduations, corporate events, and backyard celebrations across our NYC / Lower Westchester delivery area.`}
// Compatibility aliases during location-layer rename.
export const localizeScPublicCopy=localizeNycPublicCopy
export const itemDescriptionForSc=itemDescriptionForNyc
export const categoryDescriptionForSc=categoryDescriptionForNyc
