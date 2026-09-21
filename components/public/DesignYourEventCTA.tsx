'use client'

import Link from 'next/link'
import { SC_RENTSKETCH_TENANT } from '@/lib/scRentSketch'

export type DesignYourEventSource = string

interface DesignYourEventCTAProps {
  source: DesignYourEventSource
  label?: string
  variant?: 'primary' | 'secondary' | 'outline'
  className?: string
  tent?: string
  tentSlug?: string
}

/** Launch the embedded Friendly/RentSketch designer directly. */
export default function DesignYourEventCTA({
  source,
  label = 'Design Your Event',
  variant = 'primary',
  className = '',
  tent,
  tentSlug,
}: DesignYourEventCTAProps) {
  const base = 'inline-flex items-center justify-center rounded-full font-semibold px-6 py-3 transition-colors text-center'
  const variants: Record<string, string> = {
    primary: 'btn-primary',
    secondary: 'bg-white text-dark border-2 border-dark hover:bg-gray-50',
    outline: 'border-2 border-white text-white hover:bg-white/10',
  }

  const handleClick = () => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('open-design-your-event', {
      detail: { source, ...(tent ? { tent } : {}), ...(tentSlug ? { tentSlug } : {}) },
    }))
  }

  if (!SC_RENTSKETCH_TENANT) {
    return <Link href={source.startsWith('design_your_event') || source === 'home_designer_section' ? '/contact_us' : '/design-your-event'} className={`${base} ${variants[variant] || variants.primary} ${className}`}>Get Greenville Layout Help</Link>
  }

  if (source === 'mobile_home') {
    return (
      <div className="overflow-hidden rounded-3xl bg-[#0B1F3A] px-5 py-6 text-center text-white shadow-[0_12px_35px_rgba(11,31,58,.18)]">
        <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[.18em] text-[#F4C542]">RentSketch Event Designer</p>
        <h2 className="text-2xl font-black">Not Sure What Fits Your Event?</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-white/80">Tell us your guest count and build a layout with tents, tables, chairs and more. See your setup before you book.</p>
        <div className="my-5 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-lg">
          <img src="/images/design-your-event-3d-preview.png" alt="RentSketch 3D event layout preview with tent, tables, chairs and dance floor" className="h-auto w-full" />
        </div>
        <button type="button" onClick={handleClick} className="inline-flex w-full items-center justify-center rounded-xl bg-[#E07B00] px-6 py-3.5 text-center text-sm font-extrabold text-white shadow-lg transition-colors hover:bg-[#c96d00]">
          DESIGN MY EVENT
        </button>
      </div>
    )
  }

  return (
    <button type="button" onClick={handleClick} className={`${base} ${variants[variant] || variants.primary} ${className}`}>
      {label}
    </button>
  )
}
