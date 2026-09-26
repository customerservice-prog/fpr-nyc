const REPLACEMENTS:Array<[RegExp,string]>=[
 [/Friendly Party Rental SC/gi,'Friendly Party Rental NYC'],
 [/Greenville,?\s*SC/gi,'Riverdale, NY'],
 [/Greenville/gi,'Riverdale'],
 [/Upstate South Carolina/gi,'Downstate New York'],
 [/Upstate SC/gi,'Downstate NY'],
 [/South Carolina/gi,'Downstate New York'],
 [/Greenville County/gi,'the Bronx and Lower Westchester'],
 [/Syracuse,?\s*NY/gi,'Riverdale, NY'],
 [/Syracuse/gi,'Riverdale'],
 [/Minoa,?\s*NY/gi,'Riverdale, NY'],
 [/Minoa/gi,'Riverdale'],
 [/Central New York/gi,'Downstate New York'],
 [/\bCNY\b/g,'Downstate NY'],
 [/Onondaga County/gi,'the Bronx and Lower Westchester'],
 [/864[-.\s]?610[-.\s]?5324/g,'315-884-1498'],
]
export function localizeScPublicCopy(value?:string|null):string{
 let text=(value||'').trim()
 for(const [pattern,replacement] of REPLACEMENTS)text=text.replace(pattern,replacement)
 return text
}
export function itemDescriptionForSc(name:string,value?:string|null):string{
 const localized=localizeScPublicCopy(value)
 if(localized)return localized
 return `Rent the ${name} from Friendly Party Rental NYC for events in Riverdale, the Bronx and Lower Westchester. Check your date online for current availability and pricing.`
}
export function categoryDescriptionForSc(name:string,value?:string|null):string{
 const localized=localizeScPublicCopy(value)
 if(localized)return localized
 return `${name} for weddings, birthdays, graduations, corporate events and backyard celebrations across Riverdale, the Bronx and Lower Westchester.`
}
