export const GA_MEASUREMENT_ID = 'G-NV8CF7GT5C'
export const AW_CONVERSION_ID = 'AW-18374628389'

type GtagEventParams = Record<string, unknown>

export function trackEvent(eventName: string, params?: GtagEventParams) {
  if (typeof window === 'undefined') return
  const w = window as unknown as { gtag?: (...args: unknown[]) => void }
  if (typeof w.gtag === 'function') {
    w.gtag('event', eventName, params)
  }
}
