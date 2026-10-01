import type { CartItem } from '@/components/public/CartContext'
import { parseBookingHandoff, resolveDesignCart, bookingDateKey } from './rentsketchBooking'
import type { BookingHandoff, BookingCatalogItem } from './rentsketchBooking'

export type CheckoutHandoff = BookingHandoff & { deliveryZip?: string }
export function parseCheckoutHandoff(input: unknown): CheckoutHandoff {
  const parsed = parseBookingHandoff(input)
  const zip = (input as { deliveryZip?: unknown })?.deliveryZip
  return { ...parsed, ...(typeof zip === 'string' && /^\d{5}$/.test(zip) ? { deliveryZip: zip } : {}) }
}
export function resolveExactDesignCart(handoff: CheckoutHandoff, catalog: BookingCatalogItem[], existing: CartItem[], date: string) {
  // Keep unrelated rentals, but selected lines use the exact design quantity.
  // A revisited design replaces its matching selection; it never increments it.
  const selected = new Set(handoff.items.flatMap(line => catalog.filter(p => p.slug === line.slug).map(p => JSON.stringify([p.id, line.selectedColor || '']))))
  const retained = existing.filter(item => !selected.has(JSON.stringify([item.id, item.selectedColor || ''])))
  const result = resolveDesignCart(handoff, catalog, retained, date)
  for (const line of handoff.items) {
    if (catalog.filter(p => p.slug === line.slug).length > 1) result.issues.push(line.slug + ': duplicate catalog identity needs confirmation.')
  }
  for (const item of retained) {
    const product = catalog.find(p => p.id === item.id), colors = product?.colorOptions || []
    if (colors.length && (!item.selectedColor || !colors.includes(item.selectedColor))) result.issues.push(item.name + ': an existing cart color needs confirmation.')
  }
  if (date && !bookingDateKey(date)) result.issues.push('Choose a valid event date.')
  result.issues = [...new Set(result.issues)]
  return result
}
export function designImportKey(handoff: CheckoutHandoff, date: string) {
  return JSON.stringify([handoff.designId, date, handoff.items.map(i => [i.slug, i.selectedColor || '', i.quantity]).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))])
}
export function prepareDesignCheckout(storage: Pick<Storage,'getItem'|'setItem'|'removeItem'>, handoff: CheckoutHandoff, date: string) {
  let saved: Record<string, unknown> = {}
  try { const parsed = JSON.parse(storage.getItem('checkout_data') || '{}'); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) saved = parsed } catch { /* Ignore a malformed local draft. */ }
  const key = designImportKey(handoff, date)
  if (saved.rentsketchImportKey !== key) {
    // Never attach a new design to a previous payment-ready/paid order draft.
    storage.removeItem('checkout_draft_key')
    for (const field of ['checkoutDraftKey','durationTierId','calculatedDeliveryFee','calculatedDeliveryDistance','lastMinuteFeeAccepted','furnitureServices','specialRequests','orderId','stripePaymentId']) delete saved[field]
    saved.rentsketchImportKey = key
  }
  if (handoff.deliveryZip && !saved.eventAddress) saved.eventZip = handoff.deliveryZip
  if (!saved.tentSurfaceType && ['grass','concrete','asphalt','deck'].includes(handoff.surfaceType)) saved.tentSurfaceType = handoff.surfaceType === 'asphalt' ? 'concrete' : handoff.surfaceType
  storage.setItem('checkout_data', JSON.stringify(saved))
}
export function cartVariantKey(item: Pick<CartItem,'id'|'selectedColor'>) { return JSON.stringify([item.id,item.selectedColor || '']) }
export function updateCartVariant(items: CartItem[], id: string, quantity: number, selectedColor?: string) {
  if (!Number.isInteger(quantity)) return items
  const target = (item: CartItem) => item.id === id && (selectedColor === undefined || (item.selectedColor || '') === selectedColor)
  if (quantity <= 0) return items.filter(item => !target(item))
  return items.map(item => {
    if (!target(item)) return item
    const other = items.filter(other => other.id === id && other !== item).reduce((sum, other) => sum + other.quantity, 0)
    const available = Math.max(0, item.maxQuantity - other)
    return { ...item, quantity: Math.min(quantity, available) }
  }).filter(item => item.quantity > 0)
}
