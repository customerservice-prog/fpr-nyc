import { NYC_SITE_URL } from '@/lib/nycSeo'
export const SC_GSC_DOMAIN_PROPERTY = ''
export const SC_GSC_URL_PREFIX = NYC_SITE_URL.endsWith('/') ? NYC_SITE_URL : NYC_SITE_URL + '/'
export function normalizeScSearchProperty(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const input = value.trim()
  try {
    const url = new URL(input)
    const allowed = new URL(NYC_SITE_URL)
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash || url.pathname !== '/') return null
    if (url.hostname !== allowed.hostname) return null
    return url.origin + '/'
  } catch { return null }
}
const CATEGORY_SEARCH_NAMES: Record<string,string> = {
  'tent-rentals':'Tent Rentals','table-chair-rentals':'Table & Chair Rentals',
  'bounce-house-rentals':'Bounce House & Water Slide Rentals','linen-rentals':'Linen Rentals',
  'concession-machine-rentals':'Concession Machine Rentals','beverage-food-service':'Food & Beverage Service Rentals',
  'dance-floor-stage-rentals':'Dance Floor & Stage Rentals','event-lighting-rentals':'Event Lighting Rentals',
  'foam-party-machine-rentals':'Foam Party Machine Rentals','generator-rentals':'Generator Rentals',
  'heater-fan-rentals':'Heater & Fan Rentals','inflatable-movie-screen-rentals':'Inflatable Movie Screen Rentals',
  'party-rental-accessories':'Party Rental Accessories','party-rental-packages':'Party Rental Packages',
  'photobooth-rentals':'Photo Booth Rentals','restroom-rentals':'Restroom Rentals',
  'yard-game-rentals':'Yard Game Rentals','weddings':'Wedding Rentals',
}
export function categorySearchName(slug:string,fallback:string):string {
  return CATEGORY_SEARCH_NAMES[slug] || fallback.replace(/\s*[—–-]\s*(?:Greenville,?\s*SC|Riverdale,?\s*NY)$/i,'').trim()
}
