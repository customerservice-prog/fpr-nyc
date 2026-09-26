'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { NYC_SHARED_GALLERY } from '@/lib/nycSharedGallery'

interface GalleryImage { id: string; url: string; caption?: string | null }
export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>(NYC_SHARED_GALLERY)
  const [shared, setShared] = useState(true)
  const [loading, setLoading] = useState(false)
  const [index, setIndex] = useState(0)
  const [showThumbs, setShowThumbs] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    const fallback = () => { setImages(NYC_SHARED_GALLERY); setShared(true); setLoading(false) }
    fetch('/api/gallery', { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error('Gallery unavailable'); return response.json() })
      .then(data => {
        const local: GalleryImage[] = Array.isArray(data.images) ? data.images : []
        setShared(local.length === 0)
        setImages(local.length ? local : NYC_SHARED_GALLERY)
        setLoading(false)
      })
      .catch(() => { if (!controller.signal.aborted) fallback() })
    return () => controller.abort()
  }, [])
  const goNext = useCallback(() => setIndex(i => images.length ? (i + 1) % images.length : 0), [images.length])
  const goPrev = useCallback(() => setIndex(i => images.length ? (i - 1 + images.length) % images.length : 0), [images.length])
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (event.key === 'ArrowRight') goNext()
      if (event.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', keyboard)
    return () => window.removeEventListener('keydown', keyboard)
  }, [goNext, goPrev])
  if (loading) return <div className="max-w-6xl mx-auto px-4 py-16 text-center text-body">Loading gallery…</div>
  if (!images.length) return <div className="max-w-6xl mx-auto px-4 py-16 text-center text-body">No photos yet. Check back soon!</div>
  const current = images[index] || images[0]
  return <div className="max-w-6xl mx-auto px-4 py-8" data-sc-gallery="20260921-oriented">
    <h1 className="text-3xl font-bold text-center mb-1">Gallery</h1>
    <div className="mx-auto mb-3 h-1 w-24 rounded-full bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300"/>
    <p className="text-center text-body mb-2">{shared ? 'Shared Brand Gallery & Event Inspiration' : 'Real Events, Real Setups, Real Smiles'}</p>
    <p className="mx-auto max-w-3xl text-center text-body mb-6">{shared ? 'From Friendly Party Rental’s New York website. These are shared photos and design inspiration, not Greenville event photos. Equipment and availability may differ by location.' : 'Browse photos from birthdays, weddings, graduations and events shared by our Greenville team.'}</p>
    <div className="rounded-3xl bg-gradient-to-br from-amber-600 via-yellow-500 to-amber-800 p-[6px] shadow-xl">
      <div className="rounded-[1.4rem] bg-[#f5efe0] p-2 sm:p-4">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#101820] md:aspect-[16/9]">
          <Image src={current.url} alt={current.caption || 'Friendly Party Rental event photo'} fill sizes="(max-width: 767px) 100vw, 1100px" priority className="object-contain"/>
          <button type="button" onClick={goPrev} aria-label="Previous photo" className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full w-10 h-10 flex items-center justify-center text-2xl font-bold shadow-md">&#8249;</button>
          <button type="button" onClick={goNext} aria-label="Next photo" className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full w-10 h-10 flex items-center justify-center text-2xl font-bold shadow-md">&#8250;</button>
        </div>
      </div>
    </div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <span className="text-body" aria-live="polite">{index + 1} / {images.length}</span>
      {current.caption && <span className="text-body italic">{current.caption}</span>}
      <button type="button" onClick={() => setShowThumbs(s => !s)} className="min-h-10 text-blue-700 underline text-sm" aria-expanded={showThumbs}>{showThumbs ? 'Hide thumbnails' : 'Browse all photos'}</button>
    </div>
    {showThumbs && <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6 md:grid-cols-9">
      {images.map((image, i) => <button type="button" key={image.id} aria-label={`View photo ${i + 1}: ${image.caption || 'Event photo'}`} onClick={() => { setIndex(i); setShowThumbs(false) }} className={`relative aspect-square overflow-hidden rounded-lg border-2 shadow-sm ${i === index ? 'border-amber-400 ring-2 ring-amber-400' : 'border-transparent hover:border-amber-200'}`}><Image src={image.url} alt={image.caption || `Photo ${i + 1}`} fill sizes="(max-width: 767px) 30vw, 150px" className="object-cover"/></button>)}
    </div>}
  </div>
}
