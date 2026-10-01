'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import {
  STAFF_ACTIVITY_STORAGE_KEY,
  STAFF_IDLE_TIMEOUT_MS,
  STAFF_IDLE_WARNING_MS,
  STAFF_LOGOUT_STORAGE_KEY,
  recordStaffActivity,
} from '@/lib/staffSessionSecurity'

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return minutes + ':' + String(seconds).padStart(2, '0')
}

export default function StaffIdleSessionGuard() {
  const pathname = usePathname()
  const { status } = useSession()
  const [remainingMs, setRemainingMs] = useState(STAFF_IDLE_TIMEOUT_MS)
  const lastActivityRef = useRef(Date.now())
  const signingOutRef = useRef(false)
  const lastWriteRef = useRef(0)

  const endInactiveSession = useCallback(async () => {
    if (signingOutRef.current) return
    signingOutRef.current = true
    try {
      localStorage.setItem(STAFF_LOGOUT_STORAGE_KEY, String(Date.now()))
      localStorage.removeItem(STAFF_ACTIVITY_STORAGE_KEY)
    } catch {}
    await signOut({ redirect: false })
    window.location.replace('/admin/login?reason=inactive')
  }, [])

  const markActive = useCallback(() => {
    if (status !== 'authenticated') return
    const now = Date.now()
    lastActivityRef.current = now
    setRemainingMs(STAFF_IDLE_TIMEOUT_MS)
    if (now - lastWriteRef.current > 1000) {
      lastWriteRef.current = now
      try { recordStaffActivity(now) } catch {}
    }
  }, [status])

  useEffect(() => {
    if (status !== 'authenticated' || pathname === '/admin/login') return

    const now = Date.now()
    let stored = 0
    try { stored = Number(localStorage.getItem(STAFF_ACTIVITY_STORAGE_KEY) || 0) } catch {}
    if (!Number.isFinite(stored) || stored <= 0 || stored > now) {
      stored = now
      try { recordStaffActivity(now) } catch {}
    }
    lastActivityRef.current = stored
    lastWriteRef.current = stored

    const evaluate = () => {
      const remaining = STAFF_IDLE_TIMEOUT_MS - (Date.now() - lastActivityRef.current)
      setRemainingMs(Math.max(0, remaining))
      if (remaining <= 0) void endInactiveSession()
    }

    const activityEvents: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart', 'wheel']
    activityEvents.forEach((eventName) => window.addEventListener(eventName, markActive, { passive: true }))

    const onStorage = (event: StorageEvent) => {
      if (event.key === STAFF_ACTIVITY_STORAGE_KEY && event.newValue) {
        const value = Number(event.newValue)
        if (Number.isFinite(value) && value > lastActivityRef.current) {
          lastActivityRef.current = value
          setRemainingMs(STAFF_IDLE_TIMEOUT_MS)
        }
      }
      if (event.key === STAFF_LOGOUT_STORAGE_KEY && event.newValue) {
        window.location.replace('/admin/login?reason=inactive')
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') evaluate()
    }

    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', onVisibility)
    const timer = window.setInterval(evaluate, 1000)
    evaluate()

    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, markActive))
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(timer)
    }
  }, [endInactiveSession, markActive, pathname, status])

  if (status !== 'authenticated' || pathname === '/admin/login' || remainingMs > STAFF_IDLE_WARNING_MS) return null

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="idle-session-title">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-2xl">
        <div className="bg-amber-50 px-6 py-5">
          <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-xl" aria-hidden="true">🔒</div>
          <h2 id="idle-session-title" className="text-xl font-black text-slate-900">Still working?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            For security, this staff session signs out after 15 minutes without activity.
          </p>
        </div>
        <div className="px-6 py-5">
          <div className="rounded-2xl bg-slate-950 px-4 py-4 text-center text-white">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Automatic logout in</p>
            <p className="mt-1 text-4xl font-black tabular-nums">{formatRemaining(remainingMs)}</p>
          </div>
          <button
            type="button"
            onClick={markActive}
            className="mt-4 min-h-12 w-full rounded-2xl bg-[#26733a] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#1f6130] focus:outline-none focus:ring-4 focus:ring-green-200"
          >
            Keep me signed in
          </button>
          <button
            type="button"
            onClick={() => void endInactiveSession()}
            className="mt-2 min-h-11 w-full rounded-xl text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
          >
            Sign out now
          </button>
        </div>
      </div>
    </div>
  )
}
