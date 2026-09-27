export const NYC_GSC_PROPERTY=(process.env.NYC_GSC_PROPERTY||process.env.GSC_SITE_URL||'').trim()
export function normalizeNycSearchProperty(value:unknown):string|null{
  if(typeof value!=='string'||!value.trim()||!NYC_GSC_PROPERTY)return null
  return value.trim()===NYC_GSC_PROPERTY?NYC_GSC_PROPERTY:null
}
const CATEGORY_SEARCH_NAMES:Record<string,string>={
'tent-rentals':'Tent Rentals','table-chair-rentals':'Table & Chair Rentals','bounce-house-rentals':'Bounce House & Water Slide Rentals','linen-rentals':'Linen Rentals','concession-machine-rentals':'Concession Machine Rentals','beverage-food-service':'Food & Beverage Service Rentals','dance-floor-stage-rentals':'Dance Floor & Stage Rentals','event-lighting-rentals':'Event Lighting Rentals','foam-party-machine-rentals':'Foam Party Machine Rentals','generator-rentals':'Generator Rentals','heater-fan-rentals':'Heater & Fan Rentals','inflatable-movie-screen-rentals':'Inflatable Movie Screen Rentals','party-rental-accessories':'Party Rental Accessories','party-rental-packages':'Party Rental Packages','photobooth-rentals':'Photo Booth Rentals','restroom-rentals':'Restroom Rentals','yard-game-rentals':'Yard Game Rentals','weddings':'Wedding Rentals'}
export function categorySearchName(slug:string,fallback:string):string{return CATEGORY_SEARCH_NAMES[slug]||fallback.replace(/\s*[—–-]\s*(?:Riverdale,?\s*NY|NYC\s*\/\s*Downstate)$/i,'').trim()}
export const NYC_LOCAL_ENTITY_IDENTITY={name:'Friendly Party Rental NYC',phone:'315-884-1498',website:(process.env.NEXT_PUBLIC_SITE_URL||process.env.PUBLIC_BASE_URL||''),primaryMarket:'Riverdale / selected Bronx neighborhoods / Lower Westchester',businessModel:'Delivery-only service-area business; no customer warehouse pickup'} as const
export const NYC_GSC_DOMAIN_PROPERTY=NYC_GSC_PROPERTY
export const NYC_GSC_URL_PREFIX=''
