import { planningPackages, planningServices } from './eventPlanning'

export const ESTIMATE_STORAGE_KEY = 'fpr-planning-estimate-v1'
export const ESTIMATE_EVENT = 'fpr:planning-estimate'
export const EXTRA_PLANNING_RATE = 85
export const MAX_RENTAL_SELECTIONS = 24
export const MAX_RENTAL_QUANTITY = 9999
export type PlanningProgress = 'ready' | 'mostly' | 'some' | 'starting'
export type EstimateDetails = {
  eventType: string; guests: number; eventDate: string; location: string
  venueStatus: string; setting: string; progress: PlanningProgress
  styling: boolean; packageNumber: number; onsiteHours: number
  extraPrepHours: number; seatsPerTable: number; budget: number; zip: string
}
export type EstimateItem = {
  id: string; name: string; slug: string; cost: number; category: string
  categorySlug: string; image: string; available: number | null
}
export type EstimateLine = { item: EstimateItem; quantity: number; cents: number }
export type InquiryEstimate = {
  eventType: string; eventDate: string; guestCount: number
  location: string; venueStatus: string; summary: string
}
export const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
export function integer(value: unknown, fallback: number, min: number, max: number): number {
  if (value === '' || value === null || value === undefined || typeof value === 'boolean') return fallback
  const result = Number(value)
  return Number.isFinite(result) ? Math.max(min, Math.min(max, Math.round(result))) : fallback
}
function text(value: unknown, length: number) { return typeof value === 'string' ? value.slice(0, length) : '' }
function includedHours(number: number): number {
  const pkg = planningPackages.find(p => p.number === number)
  if (!pkg) return 0
  const direct = pkg.items.join(' ').match(/Up to (\d+) hours of on-site coordination/)
  if (direct) return Number(direct[1])
  const inherited = pkg.items.find(item => item.startsWith('Everything in '))?.replace('Everything in ', '')
  const parent = planningPackages.find(p => p.name === inherited && p.number < number)
  return parent ? includedHours(parent.number) : 0
}
export const estimatePackages = planningPackages.map(pkg => ({
  ...pkg, amount: Number(pkg.price.replace(/[^\d.]/g, '')), hours: includedHours(pkg.number),
  caption: [
    'Your plans, handled on the day.', 'Coordination with a styling hand.',
    'Bring every moving part together.', 'A partner for the details still ahead.',
    'From the first idea to event day.',
  ][pkg.number - 1],
  image: ['/images/event-planning/ceremony-deck/image.png', '/images/event-planning/tent-patio-setup/image.png', '/images/event-planning/outdoor-tent-setup/image.png', '/images/event-planning/tent-patio-setup/image.png', '/images/event-planning/ceremony-deck/image.png'][pkg.number - 1],
}))
export function initialEstimate(eventType = ''): EstimateDetails {
  return { eventType: planningServices.some(s => s.type === eventType) ? eventType : 'Wedding', guests: 80, eventDate: '', location: '', venueStatus: 'Still deciding', setting: 'Outdoor', progress: 'mostly', styling: false, packageNumber: eventType === 'Festival / fundraiser' ? 0 : 3, onsiteHours: 8, extraPrepHours: 0, seatsPerTable: 8, budget: 0, zip: '' }
}
export function sanitizeEstimate(raw: unknown, initialType = ''): EstimateDetails {
  const defaults = initialEstimate(initialType)
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults
  const r = raw as Record<string, unknown>
  const validDate = typeof r.eventDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.eventDate) && Number.isFinite(Date.parse(r.eventDate + 'T12:00:00Z')) && new Date(r.eventDate + 'T12:00:00Z').toISOString().slice(0, 10) === r.eventDate
  return {
    eventType: planningServices.some(s => s.type === r.eventType) ? String(r.eventType) : defaults.eventType,
    guests: integer(r.guests, defaults.guests, 1, 10000), eventDate: validDate ? String(r.eventDate) : '',
    location: text(r.location, 200), venueStatus: ['Still deciding', 'Yes, booked', 'Have a venue in mind', 'Hosting at home'].includes(String(r.venueStatus)) ? String(r.venueStatus) : defaults.venueStatus,
    setting: ['Outdoor', 'Indoor', 'Both / unsure'].includes(String(r.setting)) ? String(r.setting) : defaults.setting,
    progress: ['ready', 'mostly', 'some', 'starting'].includes(String(r.progress)) ? r.progress as PlanningProgress : defaults.progress,
    styling: r.styling === true, packageNumber: integer(r.packageNumber, defaults.packageNumber, 0, 5),
    onsiteHours: integer(r.onsiteHours, 8, 1, 24), extraPrepHours: integer(r.extraPrepHours, 0, 0, 30),
    seatsPerTable: [6, 8, 10].includes(Number(r.seatsPerTable)) ? Number(r.seatsPerTable) : 8,
    budget: integer(r.budget, 0, 0, 1000000), zip: /^\d{5}$/.test(String(r.zip)) ? String(r.zip) : '',
  }
}
export function recommendedPackage(details: EstimateDetails): number {
  if (details.eventType === 'Festival / fundraiser') return 0
  if (details.progress === 'ready') return details.styling ? 2 : 1
  return { mostly: 3, some: 4, starting: 5 }[details.progress] ?? 3
}
export function normalizeEstimateItems(value: unknown): EstimateItem[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value.flatMap(raw => {
    if (!raw || typeof raw !== 'object' || raw.displayToCustomer === false) return []
    const { id, name, slug, category } = raw
    if (typeof id !== 'string' || typeof name !== 'string' || typeof slug !== 'string' || !id || !slug || seen.has(id)) return []
    const cost = Number(raw.cost)
    if (raw.cost === null || raw.cost === '' || !Number.isFinite(cost) || cost < 0 || cost > 1000000) return []
    seen.add(id)
    return [{ id, name, slug, cost, category: String(category?.name || 'Other rentals'), categorySlug: String(category?.slug || 'other'), image: '/api/item-image/' + encodeURIComponent(slug) + '?v=' + encodeURIComponent(String(raw.updatedAt || 'catalog')), available: typeof raw.available === 'number' && Number.isFinite(raw.available) ? Math.max(0, Math.floor(raw.available)) : null }]
  })
}
export function sanitizeSelections(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return Object.fromEntries(Object.entries(raw).slice(0, MAX_RENTAL_SELECTIONS).flatMap(([id, value]) => {
    const quantity = integer(value, 0, 0, MAX_RENTAL_QUANTITY)
    return id.length > 0 && id.length <= 150 && quantity > 0 ? [[id, quantity]] : []
  }))
}
export function calculateEstimate(details: EstimateDetails, items: EstimateItem[], selections: Record<string, number>, deliveryFee: number | null = null) {
  const d = sanitizeEstimate(details)
  const pkg = estimatePackages.find(p => p.number === d.packageNumber) || null
  const extraOnsiteHours = pkg ? Math.max(0, d.onsiteHours - pkg.hours) : 0
  const extraHours = pkg ? extraOnsiteHours + d.extraPrepHours : 0
  const planningCents = pkg ? Math.round(pkg.amount * 100) : 0
  const extraCents = extraHours * EXTRA_PLANNING_RATE * 100
  const chosen = sanitizeSelections(selections)
  const lines: EstimateLine[] = []
  const unpriced: string[] = []
  const unavailable: string[] = []
  for (const [id, quantity] of Object.entries(chosen)) {
    const item = items.find(i => i.id === id)
    if (!item) { unpriced.push(id); continue }
    if (item.cost === 0) unpriced.push(item.name)
    if (item.available !== null && quantity > item.available) unavailable.push(item.name)
    lines.push({ item, quantity, cents: Math.round(item.cost * 100) * quantity })
  }
  const rentalCents = lines.reduce((sum, line) => sum + line.cents, 0)
  const deliveryCents = deliveryFee !== null && Number.isFinite(deliveryFee) && deliveryFee >= 0 && deliveryFee <= 1000000 ? Math.round(deliveryFee * 100) : null
  const subtotalCents = planningCents + extraCents + rentalCents + (deliveryCents ?? 0)
  return { pkg, extraOnsiteHours, extraHours, planningCents, extraCents, lines, rentalCents, deliveryCents, subtotalCents, perGuest: subtotalCents / 100 / d.guests, unpriced, unavailable, custom: !pkg || !!pkg.startingAt, tableCount: Math.ceil(d.guests / d.seatsPerTable) }
}
export function estimateInquiry(details: EstimateDetails, result: ReturnType<typeof calculateEstimate>): InquiryEstimate {
  const d = sanitizeEstimate(details)
  const progress = { ready: 'Everything booked', mostly: 'Mostly planned', some: 'A few things booked', starting: 'Starting from an idea' }[d.progress]
  const header = [
    'VISUAL EVENT ESTIMATE — NOT A BOOKING OR FINAL QUOTE',
    `Event: ${d.eventType}; ${d.guests} guests; ${d.setting}; ${d.eventDate || 'date undecided'}.`,
    `Progress: ${progress}. Styling help: ${d.styling ? 'requested; scope and price to confirm' : 'not requested'}.`,
    `Planning: ${result.pkg?.name || 'Custom consultation'}${result.pkg?.startingAt ? ' (starting price)' : ''}.`,
    `Requested on-site coverage: ${d.onsiteHours} hours. Extra preparation: ${d.extraPrepHours} hours.`,
    `Published planning base: ${result.pkg ? money(result.planningCents / 100) : 'Custom quote required'}. Additional planning time: ${result.pkg ? money(result.extraCents / 100) : 'Quote required'}.`,
    `Seating assumption: ${d.seatsPerTable} guests per table; confirm actual table capacity.`,
  ].join('\n')
  const footer = [
    `Rental catalog subtotal: ${money(result.rentalCents / 100)}.`,
    `ZIP delivery estimate (${d.zip || 'not entered'}): ${result.deliveryCents === null ? 'not included / confirm' : money(result.deliveryCents / 100)}.`,
    `Known-charge subtotal: ${money(result.subtotalCents / 100)}${result.custom || result.unpriced.length ? ' + amounts to confirm' : ''}.`,
    d.budget ? `Customer planning + rental budget: ${money(d.budget)} (not a price commitment).` : '',
    result.unavailable.length ? 'Some requested rental quantities exceed the selected-date availability shown. Staff review required.' : '',
    result.unpriced.length ? 'One or more rental prices could not be confirmed and are not fully included.' : '',
    'Excludes tax, damage waiver, installation/setup, special timing, third-party vendors, and any other charges not itemized. Base catalog rates only; date, duration, item rules, site suitability, quantities, services and final pricing require office confirmation.',
  ].filter(Boolean).join('\n')
  const rows = result.lines.map(l => ({ prefix: `${l.quantity} × `, name: l.item.name.replace(/\s+/g, ' '), suffix: ` @ ${l.item.cost > 0 ? money(l.item.cost) : 'confirm price'} = ${l.item.cost > 0 ? money(l.cents / 100) : 'confirm price'}` }))
  // Keep every quantity/amount and the entire limitations footer. Only shorten
  // long display names when fitting the existing inquiry message limit.
  const fixedLength = header.length + footer.length + rows.length + 1 + rows.reduce((sum, row) => sum + row.prefix.length + row.suffix.length, 0)
  const nameLimit = Math.max(0, Math.min(75, Math.floor((3600 - fixedLength) / Math.max(1, rows.length))))
  const lines = rows.map(row => row.prefix + (row.name.length > nameLimit ? row.name.slice(0, Math.max(0, nameLimit - 1)) + (nameLimit ? '…' : '') : row.name) + row.suffix)
  const summary = [header, ...lines, footer].join('\n')
  return { eventType: d.eventType, eventDate: d.eventDate, guestCount: d.guests, location: d.location, venueStatus: d.venueStatus, summary }
}
