export const CUSTOMER_ASSISTANT_ORDER_SELECT = {
  id: true,
  orderNumber: true,
  customerId: true,
  status: true,
  eventDate: true,
  eventEndDate: true,
  eventAddress: true,
  eventCity: true,
  eventState: true,
  eventZip: true,
  eventTimeSlot: true,
  pickupTimeSlot: true,
  deliveryType: true,
  deliveryFee: true,
  depositAmount: true,
  totalAmount: true,
  amountPaid: true,
  balanceDue: true,
  contractSignedAt: true,
  deliveredAt: true,
  pickedUpAt: true,
  eventStartTime: true,
  eventEndTime: true,
  deliveryWindowStart: true,
  deliveryWindowEnd: true,
  exactDeliveryRequested: true,
  exactDeliveryTime: true,
  pickupType: true,
  pickupRequiredByTime: true,
  exactPickupTime: true,
  items: {
    select: {
      itemName: true,
      quantity: true,
      unitPrice: true,
      total: true,
    },
  },
} as const

function iso(value: Date | null | undefined) {
  return value instanceof Date && Number.isFinite(value.getTime()) ? value.toISOString() : null
}

function customerStatus(value: unknown) {
  switch (String(value || '').toLowerCase()) {
    case 'active': return 'Confirmed'
    case 'completed': return 'Completed'
    case 'canceled': return 'Canceled'
    case 'quote': return 'Quote'
    case 'incomplete': return 'Checkout not completed'
    default: return 'Reservation'
  }
}

export function customerAssistantOrderView(order: any) {
  return {
    orderNumber: String(order.orderNumber || ''),
    status: customerStatus(order.status),
    eventDate: iso(order.eventDate),
    eventEndDate: iso(order.eventEndDate),
    eventAddress: order.eventAddress || null,
    eventCity: order.eventCity || null,
    eventState: order.eventState || null,
    eventZip: order.eventZip || null,
    eventTimeSlot: order.eventTimeSlot || null,
    pickupTimeSlot: order.pickupTimeSlot || null,
    deliveryType: order.deliveryType || 'delivery',
    deliveryFee: Number(order.deliveryFee || 0),
    depositAmount: Number(order.depositAmount || 0),
    totalAmount: Number(order.totalAmount || 0),
    amountPaid: Number(order.amountPaid || 0),
    balanceDue: Math.max(Number(order.balanceDue || 0), 0),
    contractSigned: Boolean(order.contractSignedAt),
    delivered: Boolean(order.deliveredAt),
    pickedUp: Boolean(order.pickedUpAt),
    schedule: {
      eventStartTime: order.eventStartTime || null,
      eventEndTime: order.eventEndTime || null,
      deliveryWindowStart: order.deliveryWindowStart || null,
      deliveryWindowEnd: order.deliveryWindowEnd || null,
      exactDeliveryRequested: Boolean(order.exactDeliveryRequested),
      exactDeliveryTime: order.exactDeliveryTime || null,
      pickupType: order.pickupType || 'flexible',
      pickupRequiredByTime: order.pickupRequiredByTime || null,
      exactPickupTime: order.exactPickupTime || null,
    },
    items: Array.isArray(order.items)
      ? order.items.map((item: any) => ({
          itemName: String(item.itemName || ''),
          quantity: Number(item.quantity || 0),
          unitPrice: Number(item.unitPrice || 0),
          total: Number(item.total || 0),
        }))
      : [],
  }
}

export function customerAssistantOrderSummary(order: any) {
  const view = customerAssistantOrderView(order)
  return {
    orderNumber: view.orderNumber,
    status: view.status,
    balanceDue: view.balanceDue,
  }
}

export function assistantDeliveryLabel(order: ReturnType<typeof customerAssistantOrderView>) {
  if (order.deliveryType === 'pickup') {
    return order.eventTimeSlot
      ? 'Your customer-pickup time is ' + order.eventTimeSlot + '.'
      : 'Your order is marked for customer pickup. I do not see a specific pickup time stored yet.'
  }
  if (order.schedule.exactDeliveryRequested && order.schedule.exactDeliveryTime) {
    return 'Your guaranteed delivery time is ' + order.schedule.exactDeliveryTime + '.'
  }
  if (order.schedule.deliveryWindowStart && order.schedule.deliveryWindowEnd) {
    return 'Your current delivery window is ' + order.schedule.deliveryWindowStart + '–' + order.schedule.deliveryWindowEnd + '.'
  }
  if (order.eventTimeSlot) return 'Your current delivery timing is ' + order.eventTimeSlot + '.'
  return 'I do not see a customer-facing delivery time stored on this order yet. I will not guess.'
}

export function assistantPickupLabel(order: ReturnType<typeof customerAssistantOrderView>) {
  if (order.deliveryType === 'pickup') {
    return order.pickupTimeSlot
      ? 'Your return time is ' + order.pickupTimeSlot + '.'
      : 'I do not see a specific customer-return time stored yet.'
  }
  if (order.schedule.pickupType === 'exact' && order.schedule.exactPickupTime) {
    return 'Your guaranteed pickup-from-event time is ' + order.schedule.exactPickupTime + '.'
  }
  if (order.schedule.pickupType === 'requiredBy' && order.schedule.pickupRequiredByTime) {
    return 'Your pickup is requested by ' + order.schedule.pickupRequiredByTime + '.'
  }
  if (order.pickupTimeSlot) return 'Your pickup timing is ' + order.pickupTimeSlot + '.'
  return 'Your pickup is currently flexible after the event; I do not see a guaranteed pickup time stored.'
}
