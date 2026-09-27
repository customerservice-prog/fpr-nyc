function configuredId(value: string | undefined, format: RegExp, blockedValue: string) {
  const id = value?.trim() || ''
  return format.test(id) && id !== blockedValue ? id : ''
}

// NYC analytics is optional and must use its own GA4 destination.
// Google Ads is intentionally disabled for this location until it is configured separately.
export const GA_MEASUREMENT_ID = configuredId(
  process.env.NEXT_PUBLIC_NYC_GA_MEASUREMENT_ID,
  /^G-[A-Z0-9]+$/,
  'G-NV8CF7GT5C',
)
export const AW_CONVERSION_ID = ''
export const AW_PURCHASE_DESTINATION = ''
export const GOOGLE_TAG_ID = GA_MEASUREMENT_ID
export const GOOGLE_TAG_BOOTSTRAP = GOOGLE_TAG_ID ? `
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
  window.gtag('js', new Date());
  window.gtag('config', ${JSON.stringify(GOOGLE_TAG_ID)});
` : ''

type GtagEventParams = Record<string, unknown>
type GoogleTagWindow = {
  dataLayer?: unknown[]
  gtag?: (...args: unknown[]) => void
}

const queuedTransactions = new WeakMap<GoogleTagWindow, Set<string>>()

export function trackEvent(eventName: string, params?: GtagEventParams) {
  if (typeof window === 'undefined' || !GA_MEASUREMENT_ID) return
  if (eventName === 'conversion') return
  if (params?.send_to && params.send_to !== GA_MEASUREMENT_ID) return

  const w = window as unknown as GoogleTagWindow
  if (typeof w.gtag !== 'function') {
    const queue = w.dataLayer || (w.dataLayer = [])
    w.gtag = function () { queue.push(arguments) }
  }

  const transactionId = params?.transaction_id
  const dedupeKey = eventName === 'purchase'
    && typeof transactionId === 'string' && transactionId.length > 0
    ? JSON.stringify([eventName, GA_MEASUREMENT_ID, transactionId])
    : null
  let transactions = queuedTransactions.get(w)
  if (dedupeKey && transactions?.has(dedupeKey)) return

  w.gtag('event', eventName, { ...params, send_to: GA_MEASUREMENT_ID })
  if (dedupeKey) {
    if (!transactions) {
      transactions = new Set<string>()
      queuedTransactions.set(w, transactions)
    }
    transactions.add(dedupeKey)
  }
}
