// Browser storage migration for Greenville's delivery-only storefront.
// Crew collection from the event is still supported; only warehouse pickup is retired.
export function migrateDeliveryOnlySession(local: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>, session: Pick<Storage, 'getItem' | 'removeItem'>): boolean {
  let checkoutWasPickup = false
  const raw = session.getItem('checkout_data')
  if (raw) {
    try {
      checkoutWasPickup = JSON.parse(raw)?.deliveryType === 'pickup'
    } catch {
      session.removeItem('checkout_data')
    }
  }
  const wasPickup = local.getItem('fpr_delivery_type') === 'pickup' || local.getItem('fpr_bookingMethod') === 'pickup' || checkoutWasPickup
  local.setItem('fpr_delivery_type', 'delivery')
  if (wasPickup) {
    local.setItem('fpr_bookingMethod', 'delivery')
    // Warehouse appointment times cannot be reused as event delivery windows.
    for (const key of ['fpr_event_time_slot', 'fpr_pickup_time_slot', 'fpr_exact_time_requested', 'fpr_scheduling_details']) {
      local.removeItem(key)
    }
    // Require the customer to review the address and delivery schedule again.
    session.removeItem('checkout_data')
  }
  return wasPickup
}
