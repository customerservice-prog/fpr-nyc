const REPLACEMENTS:Array<[RegExp,string]>=[
 [/Syracuse,?\s*NY/gi,'Riverdale, Bronx, NY'],
 [/Syracuse/gi,'Riverdale'],
 [/Minoa,?\s*NY/gi,'Riverdale, Bronx, NY'],
 [/Minoa/gi,'Riverdale'],
 [/Central New York/gi,'Downstate New York'],
 [/\bCNY\b/g,'Downstate NY'],
 [/Onondaga County/gi,'Bronx & Lower Westchester'],
 [/Greenville,?\s*SC/gi,'Riverdale, Bronx, NY'],
 [/Greenville/gi,'Riverdale'],
 [/Upstate South Carolina/gi,'Riverdale, Northwest Bronx & Lower Westchester'],
 [/Upstate SC/gi,'Downstate NY'],
 [/South Carolina/gi,'New York'],
 [/864[-.\s]?610[-.\s]?5324/g,'315-884-1498'],
]
export function localizeNycPublicCopy(value?:string|null):string{let text=(value||'').trim();for(const [pattern,replacement] of REPLACEMENTS)text=text.replace(pattern,replacement);return text}
export function itemDescriptionForNyc(name:string,value?:string|null):string{const localized=localizeNycPublicCopy(value);if(localized)return localized;return `Rent the ${name} from Friendly Party Rental NYC for events in Riverdale, the Northwest Bronx and Lower Westchester. Check your date online for current availability and pricing.`}
export function categoryDescriptionForNyc(name:string,value?:string|null):string{const localized=localizeNycPublicCopy(value);if(localized)return localized;return `${name} for weddings, birthdays, graduations, corporate events and backyard celebrations throughout Riverdale, the Northwest Bronx and Lower Westchester.`}
