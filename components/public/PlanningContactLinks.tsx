'use client'
import { trackEvent } from '@/lib/gtag'
export default function PlanningContactLinks({ compact = false }: { compact?: boolean }) {
  return <div className={compact ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-3 sm:flex-row'}>
    <a href="#planning-inquiry" onClick={() => trackEvent('planning_consultation_click', { source: compact ? 'mobile_bar' : 'hero' })} className="flex min-h-12 items-center justify-center rounded-xl bg-white px-4 py-3 text-center text-sm font-bold text-blue-950 shadow-sm">Free consultation</a>
    <a href="tel:+18646105324" onClick={() => trackEvent('planning_phone_click', { source: compact ? 'mobile_bar' : 'hero' })} className="flex min-h-12 items-center justify-center rounded-xl border border-white/40 bg-blue-950 px-4 py-3 text-center text-sm font-bold text-white">{compact ? 'Call planning team' : 'Call 864-610-5324'}</a>
  </div>
}
