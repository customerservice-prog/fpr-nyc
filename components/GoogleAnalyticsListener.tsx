'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { GA_MEASUREMENT_ID } from '@/lib/gtag'

export default function GoogleAnalyticsListener() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined' || !GA_MEASUREMENT_ID) return
    const w = window as unknown as { gtag?: (...args: unknown[]) => void }
    if (typeof w.gtag !== 'function') return
    w.gtag('config', GA_MEASUREMENT_ID, { page_path: pathname })
  }, [pathname])

  return null
}
