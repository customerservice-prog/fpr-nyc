'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { GA_MEASUREMENT_ID } from '@/lib/gtag'

export default function GoogleAnalyticsListener() {
  const pathname = usePathname()
  const lastPath = useRef(pathname)

  useEffect(() => {
    if (lastPath.current === pathname) return
    if (typeof window === 'undefined' || !GA_MEASUREMENT_ID) return
    const w = window as unknown as { gtag?: (...args: unknown[]) => void }
    if (typeof w.gtag !== 'function') return
    w.gtag('config', GA_MEASUREMENT_ID, { page_path: pathname })
    lastPath.current = pathname
  }, [pathname])

  return null
}
