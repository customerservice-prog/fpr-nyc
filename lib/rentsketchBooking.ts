import type { CartItem } from '@/components/public/CartContext'

export const RENTSKETCH_BOOKING_KEY = 'fpr_rentsketch_handoff'
export const RENTSKETCH_ATTRIBUTION_KEY = 'fpr_rentsketch_booking'
export interface DesignRental { slug: string; quantity: number; selectedColor?: string }
export interface BookingHandoff {
  version: 1
  tenant: 'friendly-nyc'
  designId: string
  eventDate: string
  source: string
  surfaceType: string
  items: DesignRental[]
}
export interface BookingAttribution {
  designId: string
  source: string
  eventDate: string
  surfaceType: string
  importedAt: number
  itemIds: string[]
}
export interface BookingCatalogItem {
  id: string
  slug: string
  name: string
  cost: number | string | null
  available?: number
  quantity: number
  displayToCustomer: boolean
  status: string
  colorOptions?: string[]
  category?: { pricingProfile?: string } | null
}

// The existing Friendly checkout stores human-readable dates ("Jun 1, 2027").
// Normalize both formats without letting a date-only ISO value shift back a day.
export function bookingDateKey(value: string | null | undefined) {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const key = value.slice(0,10), parsed = new Date(key + 'T12:00:00Z')
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === key ? key : ''
  }
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed.getFullYear() + '-' + String(parsed.getMonth()+1).padStart(2,'0') + '-' + String(parsed.getDate()).padStart(2,'0') : ''
}

export function bookingCartDate(key: string) {
  return new Date(key + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' })
}

export function parseBookingHandoff(input: unknown): BookingHandoff {
  if (!input || typeof input !== 'object') throw new Error('Open your layout in the designer and choose Check Availability & Book.')
  const p = input as Partial<BookingHandoff>
  if (p.version !== 1 || p.tenant !== 'friendly-nyc' || typeof p.designId !== 'string' || !/^[a-z0-9-]{8,100}$/i.test(p.designId)) throw new Error('This layout is not a Friendly Party Rental booking. Please reopen the designer.')
  if (!Array.isArray(p.items) || !p.items.length || p.items.length > 75) throw new Error('This layout needs a quote from our team.')
  const seen = new Set<string>()
  const items = p.items.map(item => {
    if (!item || typeof item.slug !== 'string' || !/^[-a-z0-9]{1,180}$/.test(item.slug) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000) throw new Error('A rental selection could not be read. Please return to your design.')
    if (item.selectedColor != null && (typeof item.selectedColor !== 'string' || !item.selectedColor.trim() || item.selectedColor.length > 80)) throw new Error('A color selection could not be read.')
    const selectedColor = item.selectedColor?.trim()
    const key = item.slug + '\n' + (selectedColor || '')
    if (seen.has(key)) throw new Error('This layout contains duplicate rental lines. Please reopen the designer.')
    seen.add(key)
    return { slug: item.slug, quantity: item.quantity, ...(selectedColor ? { selectedColor } : {}) }
  })
  return { version: 1, tenant: 'friendly-nyc', designId: p.designId!, eventDate: typeof p.eventDate === 'string' ? bookingDateKey(p.eventDate) : '', source: /^[a-z0-9_-]{1,100}$/i.test(p.source || '') ? p.source! : 'designer', surfaceType: ['grass','concrete','asphalt','deck','notSure'].includes(p.surfaceType || '') ? p.surfaceType! : 'notSure', items }
}

export function resolveDesignCart(handoff: BookingHandoff, catalog: BookingCatalogItem[], existing: CartItem[], eventDate: string) {
  const issues: string[] = [], imported: CartItem[] = []
  for (const selection of handoff.items) {
    const product = catalog.find(p => p.slug === selection.slug)
    if (!product || product.displayToCustomer !== true || product.status?.toLowerCase() !== 'available') {
      issues.push((product?.name || selection.slug.replace(/-/g, ' ')) + ' needs availability confirmation.'); continue
    }
    const cost = product.cost == null || product.cost === '' ? NaN : Number(product.cost)
    if (!Number.isFinite(cost) || cost < 0) { issues.push(product.name + ' needs pricing confirmation.'); continue }
    const options = product.colorOptions || [], color = selection.selectedColor
    if (options.length && (!color || !options.includes(color))) { issues.push(product.name + ': please confirm the selected color with our team.'); continue }
    if (color && !options.length && !product.name.toLowerCase().includes(color.toLowerCase())) { issues.push(product.name + ': ' + color + ' needs confirmation.'); continue }
    imported.push({ id: product.id, name: product.name, price: cost, quantity: selection.quantity, maxQuantity: product.available ?? product.quantity, picture: '/api/item-image/' + product.slug, pricingProfile: product.category?.pricingProfile || 'standard', eventDate, ...(color ? { selectedColor: color } : {}) })
  }
  // Existing cart rentals remain visible. Reopening the same design never adds
  // another copy of a tent or doubles the chair count.
  const combined: CartItem[] = existing.map(item => ({ ...item, eventDate }))
  if (combined.some(item => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000)) issues.push('An existing cart quantity is invalid. Uncheck “Keep my other cart rentals” to use this layout.')
  for (const rental of imported) {
    const index = combined.findIndex(item => item.id === rental.id && (item.selectedColor || '') === (rental.selectedColor || ''))
    if (index < 0) combined.push(rental)
    else combined[index] = { ...rental, quantity: Math.max(combined[index].quantity, rental.quantity) }
  }
  const quantities = new Map<string, number>()
  combined.forEach(item => quantities.set(item.id, (quantities.get(item.id) || 0) + item.quantity))
  for (const [id, quantity] of quantities) {
    const product = catalog.find(p => p.id === id)
    if (!product || product.displayToCustomer !== true || product.status?.toLowerCase() !== 'available') { issues.push('An existing cart rental needs confirmation. Uncheck “Keep my other cart rentals” to continue with just this design.'); continue }
    const price = product.cost == null || product.cost === '' ? NaN : Number(product.cost)
    if (!Number.isFinite(price) || price < 0) { issues.push(product.name + ' needs pricing confirmation.'); continue }
    const available = product.available ?? product.quantity
    if (!Number.isFinite(available) || quantity > available) issues.push(product.name + ': ' + quantity + ' requested; ' + (Number.isFinite(available) ? available : 0) + ' available' + (eventDate ? ' for this date.' : '.'))
    for (const item of combined.filter(item => item.id === id)) { item.price = price; item.maxQuantity = available }
  }
  return { items: combined, imported, issues: [...new Set(issues)], subtotal: combined.reduce((sum, item) => sum + Math.round(item.price * item.quantity * 100), 0) / 100 }
}

export function activeBookingAttribution(booking: BookingAttribution | null, items: CartItem[], eventDate: string | null, now = Date.now()) {
  if (!booking || !Array.isArray(booking.itemIds) || !/^[a-z0-9-]{8,100}$/i.test(booking.designId) || !Number.isFinite(booking.importedAt) || now < booking.importedAt || now - booking.importedAt > 7 * 86400000 || bookingDateKey(eventDate) !== booking.eventDate || !items.some(item => booking.itemIds.includes(item.id))) return null
  return booking
}

export function bookingOrderNotes(notes: string, booking: BookingAttribution | null, items: CartItem[]) {
  if (!booking) return notes
  const colors = items.filter(item => item.selectedColor).map(item => item.quantity + ' × ' + item.name + ' — ' + item.selectedColor)
  return [notes, 'RentSketch design: ' + booking.designId + '\nDesign source: ' + booking.source + '\nPreview setting: ' + booking.surfaceType, colors.length ? 'Selected colors:\n' + colors.join('\n') : ''].filter(Boolean).join('\n\n')
}
