'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { NYC_RENTSKETCH_TENANT } from '@/lib/nycRentSketch'

export type DesignYourEventSource = string

interface DesignYourEventCTAProps {
  source: DesignYourEventSource
  label?: string
  variant?: 'primary' | 'secondary' | 'outline'
  className?: string
  tent?: string
  tentSlug?: string
  productType?: 'tent' | 'inflatable'
}

/** Launch the embedded Friendly/RentSketch designer directly. */
export default function DesignYourEventCTA({
  source,
  label = 'Design Your Event',
  variant = 'primary',
  className = '',
  tent,
  tentSlug,
  productType = 'tent',
}: DesignYourEventCTAProps) {
  const [tentPhotoOpen, setTentPhotoOpen] = useState(false)
  useEffect(() => {
    if (!tentPhotoOpen) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setTentPhotoOpen(false) }
    document.addEventListener('keydown', onKey)
    const old = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = old }
  }, [tentPhotoOpen])

  const base = 'inline-flex items-center justify-center rounded-full font-semibold px-6 py-3 transition-colors text-center'
  const variants: Record<string, string> = {
    primary: 'btn-primary',
    secondary: 'bg-white text-dark border-2 border-dark hover:bg-gray-50',
    outline: 'border-2 border-white text-white hover:bg-white/10',
  }

  const handleClick = () => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('open-design-your-event', {
      detail: { source, productType, ...(tent ? { tent } : {}), ...(tentSlug ? { tentSlug } : {}) },
    }))
  }

  if ((tent || tentSlug) && NYC_RENTSKETCH_TENANT) {
    return <button type="button" onClick={handleClick} className={`${base} ${variants[variant] || variants.primary} ${className}`}>
      {label}
    </button>
  }

  if (tent || tentSlug) {
    const slug = tentSlug || ''
    const image = slug ? '/api/item-image/' + encodeURIComponent(slug) : ''
    return <>
      <button type="button" onClick={() => setTentPhotoOpen(true)} className={`${base} ${variants[variant] || variants.primary} ${className}`}>
        {label.replace(/3D|layout/gi, 'Tent').replace(/\s+/g, ' ').trim()}
      </button>
      {tentPhotoOpen && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={(tent || 'Tent') + ' photo'} onClick={() => setTentPhotoOpen(false)}>
        <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
          <div className="flex items-center justify-between border-b px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-gray-500">Rental tent photo</p><h2 className="mt-1 text-xl font-bold text-gray-900">{tent || 'Tent preview'}</h2></div><button type="button" onClick={() => setTentPhotoOpen(false)} aria-label="Close tent photo" className="rounded-full px-3 py-2 text-2xl leading-none text-gray-500 hover:bg-gray-100">×</button></div>
          <div className="bg-slate-50 p-4 sm:p-6">{image ? <img src={image} alt={(tent || 'Tent') + ' rental photo'} className="mx-auto max-h-[70vh] w-full object-contain" /> : <p className="py-12 text-center text-gray-600">Open the tent listing to view its rental photo.</p>}</div>
          <div className="flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-gray-600">This shows the tent itself. Event layouts are available separately in Design Your Event.</p><button type="button" onClick={() => setTentPhotoOpen(false)} className="rounded-lg bg-[#0B1F3A] px-5 py-2.5 text-sm font-bold text-white">Done</button></div>
        </div>
      </div>}
    </>
  }

  if (!NYC_RENTSKETCH_TENANT) {
    return <Link href={source.startsWith('design_your_event') || source === 'home_designer_section' ? '/contact_us' : '/design-your-event'} className={`${base} ${variants[variant] || variants.primary} ${className}`}>Get Riverdale Layout Help</Link>
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
