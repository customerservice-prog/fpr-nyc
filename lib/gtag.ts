function configuredGaId(value: string | undefined) {
  const id = value?.trim() || ''
  return /^G-[A-Z0-9]+$/.test(id) ? id : ''
}

export const GA_MEASUREMENT_ID = configuredGaId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID)
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
