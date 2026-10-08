import { rentalSchedule } from './riverdaleSchedule'

/** Rental dates are stored as calendar dates; do not shift them through the viewer's timezone. */
export interface FulfillmentOrder {
  deliveryType?: string | null
  deliveryFee?: number | null
  eventDate: string
  eventEndDate?: string | null
  rentalDays?: number | null
  deliveredAt?: string | null
  pickedUpAt?: string | null
  status?: string
}

export type JobKind = 'delivery' | 'collection' | 'riverdale' | 'complete' | 'inactive'
export const JOB_COLORS = {
  delivery: { border: '#16a34a', background: '#f0fdf4', text: '#166534' },
  collection: { border: '#2563eb', background: '#eff6ff', text: '#1e40af' },
  riverdale: { border: '#dc2626', background: '#fef2f2', text: '#991b1b' },
  complete: { border: '#94a3b8', background: '#f1f5f9', text: '#475569' },
  inactive: { border: '#94a3b8', background: '#f1f5f9', text: '#475569' },
} as const

export function isRiverdalePickup(order: Pick<FulfillmentOrder, 'deliveryType'>) {
  // Free or waived delivery is still delivery. The booking's fulfillment choice is authoritative.
  return order.deliveryType === 'pickup'
}

export function rentalDates(order: FulfillmentOrder) {
  return rentalSchedule(order)
}

export function calendarMovements(order: FulfillmentOrder, day: string) {
  const { start, end } = rentalDates(order)
  const riverdale = isRiverdalePickup(order)
  return {
    delivery: !riverdale && day === start,
    collection: !riverdale && day === end,
    riverdale: riverdale && (day === start || day === end),
  }
}

export function fulfillmentJob(order: FulfillmentOrder, day: string) {
  const { start, end } = rentalDates(order)
  const riverdale = isRiverdalePickup(order)
  let kind: JobKind
  let label: string
  if (['canceled', 'cancelled', 'quote', 'incomplete'].includes(order.status || '')) {
    kind = 'inactive'
    label = order.status === 'quote' ? 'Quote — not a scheduled job' : order.status === 'incomplete' ? 'Incomplete — not a scheduled job' : 'Canceled'
  } else if (riverdale) {
    kind = 'riverdale'
    label = day === end && day !== start ? 'Customer return — Riverdale' : start === end ? 'Customer pickup & return — Riverdale' : day === start ? 'Customer pickup — Riverdale' : 'With customer — return to Riverdale'
  } else if (order.pickedUpAt) {
    kind = 'complete'
    label = 'Picked up — complete'
  } else if (order.deliveredAt) {
    kind = 'collection'
    label = day === end ? 'Delivered — pickup due today' : 'Delivered — pickup pending'
  } else if (day === end && day !== start) {
    kind = 'collection'
    label = 'Pickup due — delivery not confirmed'
  } else {
    kind = 'delivery'
    label = start === end ? 'Delivery & pickup today' : day === start ? 'Delivery / drop-off' : 'Delivery not confirmed'
  }
  return { kind, label, riverdale, ...JOB_COLORS[kind], noDeliveryCharge: riverdale && order.deliveryFee === 0 }
}

export function matchesJobFilter(order: FulfillmentOrder, day: string, filter: string) {
  if (filter === 'all') return true
  const job = fulfillmentJob(order, day)
  return job.kind === filter
}

export function countCalendarMovements(orders: FulfillmentOrder[], day: string) {
  return orders.reduce((counts, order) => {
    const movement = calendarMovements(order, day)
    counts.deliveryCount += Number(movement.delivery)
    counts.pickupCount += Number(movement.collection)
    counts.riverdaleCount += Number(movement.riverdale)
    return counts
  }, { deliveryCount: 0, pickupCount: 0, riverdaleCount: 0 })
}
