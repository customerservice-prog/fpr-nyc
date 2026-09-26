import { CAMPAIGN_LIBRARY } from './campaignLibrary'

const DAY = 86400000
export const AUTO_CAMPAIGN_SLUGS = [
  'wedding-tent-seating', 'graduation-tables-chairs', 'backyard-summer-events',
  'corporate-picnic-season', 'fall-tent-rentals', 'corporate-holiday-early-planning',
  'new-years-eve-events', 'annual-rebooking', 'dormant-winback',
  'upsell-lighting-addon', 'upsell-photobooth-addon', 'upsell-games-addon', 'upsell-linens-addon',
] as const
type Schedule = { type: 'seasonal'; activeMonths: number[]; preferredDay: string; preferredTime: string; plannedTouches: number; priorityTier: number } | { type: 'triggered'; priorityTier: number }
// Explicitly reviewed automatic schedules. Conditional scarcity and broad
// awareness templates remain outside this registry.
export const AUTO_SCHEDULE_CONFIG: Record<string, Schedule> = {
  'wedding-tent-seating': { type:'seasonal', activeMonths:[2,3,4], preferredDay:'Tuesday', preferredTime:'10:00', plannedTouches:3, priorityTier:3 },
  'graduation-tables-chairs': { type:'seasonal', activeMonths:[3,4], preferredDay:'Thursday', preferredTime:'10:00', plannedTouches:2, priorityTier:3 },
  'backyard-summer-events': { type:'seasonal', activeMonths:[5,6], preferredDay:'Wednesday', preferredTime:'10:00', plannedTouches:3, priorityTier:3 },
  'corporate-picnic-season': { type:'seasonal', activeMonths:[6,7], preferredDay:'Tuesday', preferredTime:'09:30', plannedTouches:2, priorityTier:3 },
  'fall-tent-rentals': { type:'seasonal', activeMonths:[9,10], preferredDay:'Tuesday', preferredTime:'10:00', plannedTouches:2, priorityTier:3 },
  'corporate-holiday-early-planning': { type:'seasonal', activeMonths:[7,8,9,10], preferredDay:'Tuesday', preferredTime:'09:30', plannedTouches:3, priorityTier:3 },
  'new-years-eve-events': { type:'seasonal', activeMonths:[11,12], preferredDay:'Thursday', preferredTime:'10:00', plannedTouches:3, priorityTier:3 },
  'annual-rebooking': { type:'triggered', priorityTier:2 },
  'dormant-winback': { type:'triggered', priorityTier:2 },
  'upsell-lighting-addon': { type:'triggered', priorityTier:1 },
  'upsell-photobooth-addon': { type:'triggered', priorityTier:1 },
  'upsell-games-addon': { type:'triggered', priorityTier:1 },
  'upsell-linens-addon': { type:'triggered', priorityTier:1 },
}
const EASTERN_FORMAT = new Intl.DateTimeFormat('en-US', { timeZone:'America/New_York', weekday:'long', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false })
type EasternParts = { weekday:string; year:number; month:number; day:number; hour:number; minute:number }
const PARTS_CACHE = new Map<number,EasternParts>()
function getEasternParts(date: Date): EasternParts {
  const timestamp = date.getTime()
  const cached = PARTS_CACHE.get(timestamp)
  if (cached) return cached
  const parts = EASTERN_FORMAT.formatToParts(date)
  const value = (type: string) => parts.find(p => p.type === type)?.value || ''
  const result = { weekday:value('weekday'), year:Number(value('year')), month:Number(value('month')), day:Number(value('day')), hour:Number(value('hour')) % 24, minute:Number(value('minute')) }
  if (PARTS_CACHE.size >= 8192) PARTS_CACHE.clear()
  PARTS_CACHE.set(timestamp,result)
  return result
}
export type AutoCampaignSlug = typeof AUTO_CAMPAIGN_SLUGS[number]
export type AutomationOrder = {
  id: string; eventDate: Date; createdAt: Date; source?: string; notes: string | null; confirmed?: boolean; availableAddonSlugs?: string[]
  items: { itemName: string; categorySlug: string; categoryName: string }[]
}
export type AutomationContact = {
  email: string; eligible: boolean; company: string; orders: AutomationOrder[]; customerRecords?: number
}
export type AutomationOpportunity = {
  email: string; slug: string; occurrenceKey: string; reason: string; priority: number
  orderId?: string; dueAt: string; expiresAt: string
}
export type AutomationCampaignSummary = {
  slug: string; name: string; audienceCount: number; dueCount: number; nextRunAt: string | null; reason: string
}
export type AutomationPlan = {
  generatedAt: string; customerRecords: number; contactsCount: number; eligibleCount: number
  campaigns: AutomationCampaignSummary[]; opportunities: AutomationOpportunity[]; nextRuns: AutomationOpportunity[]
}

export function automationSegmentForCampaign(slug: string): string | null {
  return (AUTO_CAMPAIGN_SLUGS as readonly string[]).includes(slug) ? `automation:${slug}` : null
}
export function isAutomationSendWindow(now = new Date()): boolean {
  const p = getEasternParts(now)
  return p.hour >= 9 && p.hour < 17
}

// Convert an Eastern wall-clock time without depending on the server's timezone.
export function easternDateTime(date: string, time = '10:00'): Date {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const target = Date.UTC(year, month - 1, day, hour, minute)
  let result = target
  for (let attempt = 0; attempt < 3; attempt++) {
    const p = getEasternParts(new Date(result))
    const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
    result += target - wall
  }
  return new Date(result)
}
function easternDay(date: Date): string {
  const p = getEasternParts(date)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}
function calendarDay(date: Date, days: number): Date {
  const p = getEasternParts(date)
  const shifted = new Date(Date.UTC(p.year, p.month - 1, p.day + days, 12))
  return easternDateTime(shifted.toISOString().slice(0, 10))
}
function businessDay(date: Date): Date {
  let result = easternDateTime(easternDay(date))
  while (['Saturday', 'Sunday'].includes(getEasternParts(result).weekday)) result = calendarDay(result, 1)
  return result
}

// A finite set of deliberate touches across each active season, never every week.
const SEASON_CACHE = new Map<string, Date[]>()
export function seasonalTouchDates(slug: string, year: number): Date[] {
  const cached = SEASON_CACHE.get(`${slug}:${year}`)
  if (cached) return cached
  const config = AUTO_SCHEDULE_CONFIG[slug]
  if (!config || config.type !== 'seasonal' || config.plannedTouches < 1) return []
  const candidates: Date[] = []
  for (let day = new Date(Date.UTC(year, 0, 1, 12)); day.getUTCFullYear() === year; day = new Date(day.getTime() + DAY)) {
    const date = easternDateTime(day.toISOString().slice(0, 10), config.preferredTime)
    const p = getEasternParts(date)
    if (config.activeMonths.includes(p.month) && p.weekday === config.preferredDay) candidates.push(date)
  }
  const count = Math.min(config.plannedTouches, candidates.length)
  const dates = Array.from({ length: count }, (_, i) => candidates[Math.min(candidates.length - 1, Math.floor((i + .5) * candidates.length / count))])
  SEASON_CACHE.set(`${slug}:${year}`, dates)
  return dates
}

function itemText(order: AutomationOrder): string {
  return order.items.map(i => `${i.itemName} ${i.categorySlug} ${i.categoryName}`).join(' ').toLowerCase()
}
function hasCategory(order: AutomationOrder, expression: RegExp): boolean {
  return expression.test(itemText(order))
}
function explicitEvent(order: AutomationOrder, event: 'wedding' | 'graduation' | 'new-year'): boolean {
  const expressions = {
    wedding: /\b(wedding|bridal)\b/i,
    graduation: /\b(graduation|graduate)\b/i,
    'new-year': /\bnew[ -]?year(?:s)?\b/i,
  }
  // Category/item evidence or an explicitly labeled event field in order notes.
  // Generic tent/chair purchases never imply a wedding or graduation.
  return expressions[event].test(itemText(order)) || (order.notes || '').split(/\n|;/).some(line => /^\s*(?:event(?:\s*type)?|occasion|tag)\s*[:=]\s*/i.test(line) && expressions[event].test(line))
}
function corporate(contact: AutomationContact): boolean {
  return !!contact.company.trim() && !/^(?:n\/?a|none|personal|no company|not applicable)$/i.test(contact.company.trim())
}
function upcomingOrders(contact: AutomationContact, now: Date): AutomationOrder[] {
  const today = easternDay(now)
  return contact.orders.filter(o => easternDay(o.eventDate) >= today).sort((a,b) => a.eventDate.getTime() - b.eventDate.getTime())
}
function pastOrders(contact: AutomationContact, now: Date): AutomationOrder[] {
  const today = easternDay(now)
  return contact.orders.filter(o => o.confirmed !== false && easternDay(o.eventDate) < today).sort((a,b) => b.eventDate.getTime() - a.eventDate.getTime())
}
const ADDON_CATEGORIES: Record<string, RegExp> = {
  'upsell-lighting-addon': /\b(light(?:ing|s)?|chandelier|string[- ]lights)\b/i,
  'upsell-photobooth-addon': /photo[ -]?booth/i,
  'upsell-games-addon': /\b(game|games|cornhole|jenga|connect.?4)\b/i,
  'upsell-linens-addon': /\b(linen|linens|tablecloth|tablecloths|table.?cover|table.?covers)\b/i,
}
export type AutomationCatalogItem = { name: string; bookableAfter: Date | null; category: { slug: string; name: string } }
export function catalogAddonSlugs(items: AutomationCatalogItem[], eventDate: Date): string[] {
  return Object.entries(ADDON_CATEGORIES).filter(([,expression]) => items.some(item => (!item.bookableAfter || item.bookableAfter <= eventDate) && expression.test(`${item.name} ${item.category.slug} ${item.category.name}`))).map(([slug]) => slug)
}
export function campaignAudienceReason(contact: AutomationContact, slug: string, now = new Date()): string | null {
  if (!contact.eligible || !automationSegmentForCampaign(slug)) return null
  const upcoming = upcomingOrders(contact, now)
  const past = pastOrders(contact, now)
  if (ADDON_CATEGORIES[slug]) {
    const order = upcoming.find(o => {
      const days = (o.eventDate.getTime() - now.getTime()) / DAY
      if (o.confirmed === false || (o.availableAddonSlugs && !o.availableAddonSlugs.includes(slug))) return false
      if (days < 7 || days > 365 || hasCategory(o, ADDON_CATEGORIES[slug])) return false
      if (slug === 'upsell-linens-addon') return hasCategory(o, /\btable(?:s)?\b/i)
      if (slug === 'upsell-lighting-addon') return hasCategory(o, /\b(tent|tents|canopy|canopies|dance.?floor)\b/i)
      if (slug === 'upsell-games-addon') return hasCategory(o, /\b(tent|tents|canopy|canopies|inflatable|bounce)\b/i)
      return hasCategory(o, /\b(tent|tents|table|tables|dance.?floor|wedding)\b/i)
    })
    return order ? 'A confirmed upcoming order does not include this add-on category; the offer window is 45–7 days before the event.' : null
  }
  if (upcoming.length || !past.length) return null
  if (slug === 'annual-rebooking') return 'Past confirmed customer; timing follows the latest event anniversary using original booking history when available, otherwise a 60-day planning window.'
  if (slug === 'dormant-winback') return 'Past confirmed customer with no upcoming booking; one reactivation window after 12 months.'
  if (slug === 'wedding-tent-seating') return past.some(o => explicitEvent(o, 'wedding')) ? 'Recorded wedding category, item, or explicitly tagged wedding event.' : null
  if (slug === 'graduation-tables-chairs') return past.some(o => explicitEvent(o, 'graduation')) ? 'Recorded graduation item or explicitly tagged graduation event.' : null
  if (slug === 'corporate-picnic-season' || slug === 'corporate-holiday-early-planning') return corporate(contact) ? 'Company on file and a past confirmed order.' : null
  if (slug === 'backyard-summer-events') return past.some(o => [5,6,7,8].includes(getEasternParts(o.eventDate).month) && hasCategory(o, /\b(tent|tents|canopy|canopies|game|games|inflatable|bounce)\b/i)) ? 'Past summer event with outdoor rental history.' : null
  if (slug === 'fall-tent-rentals') return past.some(o => [9,10,11].includes(getEasternParts(o.eventDate).month) && hasCategory(o, /\b(tent|tents|canopy|canopies)\b/i)) ? 'Past fall event with tent or canopy rental history.' : null
  if (slug === 'new-years-eve-events') return past.some(o => explicitEvent(o, 'new-year') || (getEasternParts(o.eventDate).month === 12 && getEasternParts(o.eventDate).day === 31)) ? 'Recorded New Year event or a past December 31 event.' : null
  return null
}

function anniversary(order: AutomationOrder, year: number): Date {
  const p = getEasternParts(order.eventDate)
  const lastDay = new Date(Date.UTC(year, p.month, 0)).getUTCDate()
  return easternDateTime(`${year}-${String(p.month).padStart(2,'0')}-${String(Math.min(p.day,lastDay)).padStart(2,'0')}`)
}
function rebookingLeadTime(order: AutomationOrder): { days: number; explanation: string } {
  const observedDays = Math.round((order.eventDate.getTime() - order.createdAt.getTime()) / DAY)
  // An import's createdAt records when it entered this database, not when the
  // customer booked. Unknown sources and impossible chronology get a declared
  // planning default rather than a misleading "observed" 14-day reminder.
  const originalBookingSource = ['online', 'admin', 'manual', 'phone'].includes((order.source || '').trim().toLowerCase())
  if (!originalBookingSource || !Number.isFinite(observedDays) || observedDays < 0) {
    return { days: 60, explanation: 'Original booking lead time is unavailable; using a 60-day planning window before the anniversary.' }
  }
  const days = Math.min(120,Math.max(14,observedDays))
  return { days, explanation: `Observed lead time: ${observedDays} days; planning window: ${days} days before the anniversary.` }
}
function makeOpportunity(contact: AutomationContact, slug: string, occurrence: string, due: Date, expires: Date, reason: string, orderId?: string): AutomationOpportunity {
  return { email: contact.email, slug, occurrenceKey: `auto:${slug}:${occurrence}`, reason, priority: AUTO_SCHEDULE_CONFIG[slug]?.priorityTier || 4, orderId, dueAt: due.toISOString(), expiresAt: expires.toISOString() }
}
function contactOpportunities(contact: AutomationContact, slug: string, now: Date): AutomationOpportunity[] {
  const reason = campaignAudienceReason(contact, slug, now)
  if (!reason) return []
  const config = AUTO_SCHEDULE_CONFIG[slug]
  const year = getEasternParts(now).year
  if (config?.type === 'seasonal') {
    return [year,year + 1].flatMap(y => seasonalTouchDates(slug,y).map((due,i) => makeOpportunity(contact, slug, `${y}:touch${i + 1}`, due, calendarDay(due, 7), reason)))
  }
  if (ADDON_CATEGORIES[slug]) {
    // Re-use the exact audience checks for each order so a different future order
    // cannot accidentally supply the missing-category evidence for this one.
    return upcomingOrders(contact,now).filter(order => campaignAudienceReason({ ...contact, orders: [order] },slug,now)).map(order => {
      const due = businessDay(calendarDay(order.eventDate,-45))
      return makeOpportunity(contact,slug,order.id,due,calendarDay(order.eventDate,-7),reason,order.id)
    })
  }
  const last = pastOrders(contact,now)[0]
  if (!last) return []
  if (slug === 'dormant-winback') {
    const due = businessDay(calendarDay(last.eventDate,365))
    return [makeOpportunity(contact,slug,last.id,due,calendarDay(last.eventDate,455),reason,last.id)]
  }
  // One anniversary after the last event; old inactive customers move to the
  // separate winback window rather than receiving annual reminders forever.
  const targetYear = getEasternParts(last.eventDate).year + 1
  const eventAnniversary = anniversary(last,targetYear)
  const leadTime = rebookingLeadTime(last)
  const due = businessDay(calendarDay(eventAnniversary,-leadTime.days))
  const expires = new Date(Math.min(calendarDay(due,21).getTime(), calendarDay(eventAnniversary,-7).getTime()))
  return [makeOpportunity(contact,slug,`${last.id}:${targetYear}`,due,expires,`${reason} ${leadTime.explanation}`,last.id)]
}

export function buildAutomationPlan(contacts: AutomationContact[], now = new Date()): AutomationPlan {
  const opportunities: AutomationOpportunity[] = []
  const nextRuns: AutomationOpportunity[] = []
  const campaigns = AUTO_CAMPAIGN_SLUGS.map(slug => {
    const matches = contacts.filter(contact => campaignAudienceReason(contact,slug,now))
    let dueCount = 0
    let nextRunAt: string | null = null
    for (const contact of matches) {
      const options = contactOpportunities(contact,slug,now).sort((a,b) => a.dueAt.localeCompare(b.dueAt))
      for (const option of options) {
        if (Date.parse(option.dueAt) <= now.getTime() && Date.parse(option.expiresAt) > now.getTime()) { opportunities.push(option); dueCount++; }
      }
      const next = options.find(option => Date.parse(option.dueAt) > now.getTime())
      if (next) { nextRuns.push(next); if (!nextRunAt || next.dueAt < nextRunAt) nextRunAt = next.dueAt }
    }
    const campaign = CAMPAIGN_LIBRARY.find(c => c.slug === slug)!
    return { slug, name: campaign.name, audienceCount: matches.length, dueCount, nextRunAt, reason: matches.length ? campaignAudienceReason(matches[0],slug,now)! : 'No eligible customer currently has the required confirmed order history.' }
  })
  opportunities.sort((a,b) => a.priority - b.priority || a.dueAt.localeCompare(b.dueAt) || a.slug.localeCompare(b.slug) || a.email.localeCompare(b.email))
  nextRuns.sort((a,b) => a.dueAt.localeCompare(b.dueAt) || a.priority - b.priority)
  return { generatedAt: now.toISOString(), customerRecords: contacts.reduce((sum,contact) => sum + (contact.customerRecords ?? 1),0), contactsCount: contacts.length, eligibleCount: contacts.filter(c => c.eligible).length, campaigns, opportunities, nextRuns }
}

