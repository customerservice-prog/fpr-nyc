function configuredId(value: string | undefined, format: RegExp, blockedValue: string) {
  const id = value?.trim() || ''
  return format.test(id) && id !== blockedValue ? id : ''
}

// SC must never fall back to the copied New York destinations. These public
// values are optional and are inlined by Next.js at build time.
export const GA_MEASUREMENT_ID = configuredId(process.env.NEXT_PUBLIC_NYC_GA_MEASUREMENT_ID, /^G-[A-Z0-9]+$/, 'G-NV8CF7GT5C')
export const AW_CONVERSION_ID = configuredId(process.env.NEXT_PUBLIC_NYC_GOOGLE_ADS_ID, /^AW-\d+$/, 'AW-18374628389')
const purchaseLabel = configuredId(process.env.NEXT_PUBLIC_NYC_GOOGLE_ADS_PURCHASE_LABEL, /^[A-Za-z0-9_-]+$/, 'ig-ZCL_Q1d0cEKWo2rlE')
export const AW_PURCHASE_DESTINATION = AW_CONVERSION_ID && purchaseLabel ? `${AW_CONVERSION_ID}/${purchaseLabel}` : ''
export const GOOGLE_TAG_ID = GA_MEASUREMENT_ID || AW_CONVERSION_ID
export const GOOGLE_TAG_BOOTSTRAP = GOOGLE_TAG_ID ? `
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
  window.gtag('js', new Date());
  ${[GA_MEASUREMENT_ID, AW_CONVERSION_ID].filter(Boolean).map(id => `window.gtag('config', ${JSON.stringify(id)});`).join('\n')}
` : ''

type GtagEventParams = Record<string, unknown>
type GoogleTagWindow = {
  dataLayer?: unknown[]
  gtag?: (...args: unknown[]) => void
}

const queuedTransactions = new WeakMap<GoogleTagWindow, Set<string>>()

export function trackEvent(eventName: string, params?: GtagEventParams) {
  if (typeof window === 'undefined') return
  const destination = eventName === 'conversion' ? AW_PURCHASE_DESTINATION : GA_MEASUREMENT_ID
  if (!destination || (params?.send_to && params.send_to !== destination)) return

  const w = window as unknown as GoogleTagWindow
  if (typeof w.gtag !== 'function') {
    const queue = w.dataLayer || (w.dataLayer = [])
    w.gtag = function () { queue.push(arguments) }
  }

  const transactionId = params?.transaction_id
  const dedupeKey = (eventName === 'purchase' || eventName === 'conversion')
    && typeof transactionId === 'string' && transactionId.length > 0
    ? JSON.stringify([eventName, destination, transactionId])
    : null
  let transactions = queuedTransactions.get(w)
  if (dedupeKey && transactions?.has(dedupeKey)) return

  w.gtag('event', eventName, { ...params, send_to: destination })
  if (dedupeKey) {
    if (!transactions) {
      transactions = new Set<string>()
      queuedTransactions.set(w, transactions)
    }
    transactions.add(dedupeKey)
  }
}
