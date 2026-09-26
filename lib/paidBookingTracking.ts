import { AW_PURCHASE_DESTINATION, trackEvent } from '@/lib/gtag'
import type { PaymentReceipt } from '@/lib/paymentReceipt'

const queuedEvents = new WeakMap<Window, Set<string>>()

export function trackPaidBooking(receipt: PaymentReceipt) {
  if (typeof window === 'undefined' || receipt.status !== 'succeeded'
    || !receipt.purchaseEligible || !receipt.paymentId || !receipt.orderNumber
    || receipt.currency !== 'USD' || !Number.isFinite(receipt.amountPaid)
    || receipt.amountPaid <= 0) return

  const params = {
    transaction_id: receipt.orderNumber,
    value: receipt.amountPaid,
    currency: receipt.currency,
  }
  const events: Array<[string, Record<string, unknown>]> = [
    ['purchase', params],
    ...(AW_PURCHASE_DESTINATION ? [['conversion', { ...params, send_to: AW_PURCHASE_DESTINATION }] as [string, Record<string, unknown>]] : []),
  ]

  let queued = queuedEvents.get(window)
  if (!queued) {
    queued = new Set<string>()
    queuedEvents.set(window, queued)
  }
  for (const [name, eventParams] of events) {
    const key = JSON.stringify([receipt.orderNumber, name])
    if (queued.has(key)) continue
    try {
      trackEvent(name, eventParams)
      queued.add(key)
    } catch {
      // Analytics must never turn a successful payment into a checkout failure.
    }
  }
}
