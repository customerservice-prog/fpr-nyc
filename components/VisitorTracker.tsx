'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

// First-party visitor tracker. Sends a lightweight ping to /api/track on every
// route change and on a periodic heartbeat so the admin dashboard can show a
// realtime "who's online" view. This is separate from (and does not depend on)
// Google Analytics. It stores only a random visitor id in localStorage.

function getVisitorId(): string {
  try {
    const key = 'fpr_vid'
    let id = localStorage.getItem(key)
    if (!id) {
      id =
        (typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : 'v-' + Math.random().toString(36).slice(2) + Date.now().toString(36))
      localStorage.setItem(key, id)
    }
    return id
  } catch {
    return 'anon'
  }
}

export default function VisitorTracker() {
  const pathname = usePathname()
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Don't track the admin area itself; we care about public site visitors.
    if (pathname && pathname.startsWith('/admin')) return

    const visitorId = getVisitorId()

    const send = () => {
      try {
        const payload = JSON.stringify({
          visitorId,
          path: pathname,
          referrer: document.referrer || null,
        })
        const url = '/api/track'
        if (navigator.sendBeacon) {
          navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }))
        } else {
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          }).catch(() => {})
        }
      } catch {
        // never let tracking break the page
      }
    }

    // Fire on navigation (avoid duplicate for same path).
    if (lastPath.current !== pathname) {
      lastPath.current = pathname
      send()
    }

    // Heartbeat so an idle-but-open tab still counts as "active now".
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') send()
    }, 60 * 1000)

    return () => clearInterval(interval)
  }, [pathname])

  return null
}
