'use client'

import { useEffect, useRef } from 'react'

const STORAGE_KEY = 'fpr.admin.loadedDeployment.v1'
const CHECK_INTERVAL_MS = 30_000

async function readDeploymentVersion() {
  const response = await fetch('/api/deployment-version?t=' + Date.now(), {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' },
  })
  if (!response.ok) throw new Error('version check failed')
  const data = await response.json()
  return typeof data.version === 'string' ? data.version : 'unknown'
}

export default function AdminDeploymentRefreshGuard() {
  const currentRef = useRef<string | null>(null)
  const reloadingRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      if (cancelled || reloadingRef.current) return
      try {
        const version = await readDeploymentVersion()
        if (!version || version === 'unknown') return

        if (!currentRef.current) {
          currentRef.current = version
          try { sessionStorage.setItem(STORAGE_KEY, version) } catch {}
          return
        }

        if (version !== currentRef.current) {
          reloadingRef.current = true
          try { sessionStorage.setItem(STORAGE_KEY, version) } catch {}
          window.location.reload()
        }
      } catch {
        // Network/version checks must never interrupt active staff work.
      }
    }

    void check()
    const timer = window.setInterval(() => void check(), CHECK_INTERVAL_MS)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void check()
    }
    const onFocus = () => void check()

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  return null
}
