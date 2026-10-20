'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { CalendarDays, CheckCircle2, Phone, X } from 'lucide-react'

const STORAGE_KEY = 'fpr-nyc-2027-arrival-notice-v1'
const EXEMPT_PREFIXES = [
  '/pay/',
  '/contract/',
  '/save-card/',
  '/schedule/',
  '/checkout/confirmation',
  '/unsubscribe',
]

export default function Nyc2027ArrivalNotice() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (EXEMPT_PREFIXES.some(prefix => pathname.startsWith(prefix))) return
    try {
      if (window.sessionStorage.getItem(STORAGE_KEY) !== 'seen') setOpen(true)
    } catch {
      setOpen(true)
    }
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function remember() {
    try { window.sessionStorage.setItem(STORAGE_KEY, 'seen') } catch {}
  }

  function dismiss() {
    remember()
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={event => { if (event.target === event.currentTarget) dismiss() }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="nyc-2027-arrival-title"
        aria-describedby="nyc-2027-arrival-description"
        className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-slate-600 shadow hover:bg-white hover:text-slate-950"
          aria-label="Close booking notice"
        >
          <X size={20} />
        </button>

        <div className="bg-gradient-to-r from-blue-950 via-blue-800 to-blue-700 px-6 pb-7 pt-8 text-white sm:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-blue-950">
            <CalendarDays size={15} />
            Riverdale / NYC
          </div>
          <h2 id="nyc-2027-arrival-title" className="pr-10 text-3xl font-black leading-tight sm:text-4xl">
            Now Booking 2027 & Beyond
          </h2>
          <p id="nyc-2027-arrival-description" className="mt-3 max-w-lg text-base leading-7 text-blue-50">
            You are welcome to browse everything now. New Riverdale / NYC online reservations must have an event date on or after <strong>January 1, 2027</strong>.
          </p>
        </div>

        <div className="space-y-5 px-6 py-6 sm:px-8">
          <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            <div className="flex gap-3 rounded-2xl bg-slate-50 p-4">
              <CheckCircle2 className="mt-0.5 shrink-0 text-green-700" size={20} />
              <div><strong className="block text-slate-950">Planning a 2027+ event?</strong>Pick your date and start building your rental order online.</div>
            </div>
            <div className="flex gap-3 rounded-2xl bg-amber-50 p-4">
              <Phone className="mt-0.5 shrink-0 text-amber-700" size={20} />
              <div><strong className="block text-slate-950">Need help?</strong>Call or text our Riverdale team and we can answer questions before you book.</div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/order-by-date"
              onClick={dismiss}
              className="rounded-xl bg-blue-700 px-5 py-3.5 text-center font-bold text-white shadow hover:bg-blue-800"
            >
              Choose My 2027 Date
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-xl border-2 border-slate-200 px-5 py-3.5 font-bold text-slate-800 hover:border-slate-300 hover:bg-slate-50"
            >
              Browse Rentals First
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm text-slate-700">
            Questions? <a href="tel:7182834593" className="font-bold text-blue-700 underline">Call 718-283-4593</a>
            <span className="mx-2 text-slate-300">|</span>
            <a href="sms:7182834593" className="font-bold text-blue-700 underline">Text us</a>
          </div>

          <p className="text-center text-xs leading-5 text-slate-500">
            This notice appears once per browsing session so it does not keep interrupting you.
          </p>
        </div>
      </section>
    </div>
  )
}
