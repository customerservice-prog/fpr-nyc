'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { NYC_RENTSKETCH_TENANT, nycRentSketchEmbedUrl } from '@/lib/nycRentSketch'

export type DesignYourEventSource = string

interface DesignYourEventCTAProps {
  source: DesignYourEventSource
  label?: string
  variant?: 'primary' | 'secondary' | 'outline'
  className?: string
  tent?: string
  tentSlug?: string
  product?: string
  productSlug?: string
  view?: '2d' | '3d'
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
  product,
  productSlug,
  view = '3d',
  productType = 'tent',
}: DesignYourEventCTAProps) {
  const [tentPhotoOpen, setTentPhotoOpen] = useState(false)
  const photoDialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = photoDialog.current
    if (!tentPhotoOpen || !dialog) return
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const old = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    return () => {
      if (dialog.open) dialog.close()
      document.body.style.overflow = old
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true })
    }
  }, [tentPhotoOpen])

  const base = 'inline-flex items-center justify-center rounded-full font-semibold px-6 py-3 transition-colors text-center'
  const variants: Record<string, string> = {
    primary: 'btn-primary',
    secondary: 'bg-white text-dark border-2 border-dark hover:bg-gray-50',
    outline: 'border-2 border-white text-white hover:bg-white/10',
  }

  const previewHref = nycRentSketchEmbedUrl({ source, name: product || tent, slug: productSlug || tentSlug, productType, view })
  const handleClick = (event: { preventDefault: () => void }) => {
    if (typeof window === 'undefined') return
    event.preventDefault()
    window.dispatchEvent(new CustomEvent('open-design-your-event', {
      detail: { source, product, productSlug, view, ...(tent ? { tent } : {}), ...(tentSlug ? { tentSlug } : {}), productType },
    }))
  }

  if ((tent || tentSlug) && (source === 'tent_item_card' || !NYC_RENTSKETCH_TENANT)) {
    const slug = tentSlug || ''
    const image = slug ? '/api/item-image/' + encodeURIComponent(slug) : ''
    const rentalType = productType === 'inflatable' ? 'inflatable' : 'tent'
    return <>
      <button type="button" onClick={() => setTentPhotoOpen(true)} className={`${base} ${variants[variant] || variants.primary} ${className}`}>
        {productType === 'inflatable' ? 'View Inflatable Photo' : 'View Tent Photo'}
      </button>
      {tentPhotoOpen && <dialog ref={photoDialog} className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-y-auto border-0 bg-black/70 p-4" aria-label={(tent || 'Rental') + ' photo'} onCancel={event => { event.preventDefault(); setTentPhotoOpen(false) }} onClick={() => setTentPhotoOpen(false)}>
        <div className="flex min-h-full items-center justify-center">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
          <div className="flex items-center justify-between border-b px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-gray-500">{productType === 'inflatable' ? 'Rental inflatable photo' : 'Rental tent photo'}</p><h2 className="mt-1 text-xl font-bold text-gray-900">{tent || 'Rental preview'}</h2></div><button type="button" onClick={() => setTentPhotoOpen(false)} aria-label={`Close ${rentalType} photo`} className="rounded-full px-3 py-2 text-2xl leading-none text-gray-500 hover:bg-gray-100">×</button></div>
          <div className="bg-slate-50 p-4 sm:p-6">{image ? <img src={image} alt={(tent || 'Rental') + ' rental photo'} className="mx-auto max-h-[65vh] w-full object-contain" /> : <p className="py-12 text-center text-gray-600">Open the rental listing to view its photo.</p>}</div>
          <div className="flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-gray-600">This shows the {rentalType} itself. Visit Design Your Event for layout planning.</p><button type="button" onClick={() => setTentPhotoOpen(false)} className="rounded-lg bg-[#0B1F3A] px-5 py-2.5 text-sm font-bold text-white">Done</button></div>
          </div>
        </div>
      </dialog>}
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
        <a href={previewHref} onClick={handleClick} className="inline-flex w-full items-center justify-center rounded-xl bg-[#E07B00] px-6 py-3.5 text-center text-sm font-extrabold text-white shadow-lg transition-colors hover:bg-[#c96d00]">
          DESIGN MY EVENT
        </a>
        <p className="mt-3 text-xs text-white/80">Free planning · No card · No order number required</p>
      </div>
    )
  }

  return (
    <a href={previewHref} onClick={handleClick} className={`${base} ${variants[variant] || variants.primary} ${className}`}>
      {label}
    </a>
  )
}
