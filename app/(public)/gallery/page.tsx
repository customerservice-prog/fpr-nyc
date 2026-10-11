'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
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
        setIndex(0)
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
  return (
    <div className="max-w-6xl mx-auto px-4 py-8" data-sc-gallery="20260921-oriented">
      <h1 className="text-3xl font-bold text-center mb-1">Gallery</h1>
      <div className="mx-auto mb-3 h-1 w-24 rounded-full bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300" />
      <p className="text-center text-body mb-2">
        {shared ? 'Event Setup Inspiration' : 'Real Events, Real Setups, Real Smiles'}
      </p>
      <p className="text-center text-body mb-6">
        {shared ? 'Friendly Party Rental setups for design inspiration. Not every photo is from a Riverdale event; check each rental page for current NYC availability.' : 'Browse photos from birthdays, weddings, graduations and events shared by our NYC / Downstate team.'}
      </p>

      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mb-6 text-amber-800">
        <Link href="/category/tent-rentals" prefetch={false} className="hover:underline">Browse tent rentals</Link>
        <Link href="/design-your-event" prefetch={false} className="hover:underline">Design your own layout</Link>
        <Link href="/order-by-date" prefetch={false} className="hover:underline">Check your event date</Link>
      </div>

      <div className="relative rounded-3xl bg-gradient-to-br from-amber-600 via-yellow-500 to-amber-800 p-[6px] shadow-2xl shadow-amber-900/40">
        <div className="rounded-[1.4rem] bg-gradient-to-br from-neutral-900 to-neutral-700 p-[2px]">
          <div className="rounded-[1.3rem] bg-[#f5efe0] p-3 sm:p-4 shadow-inner">
            <div
              className="relative bg-black rounded-xl overflow-hidden flex items-center justify-center ring-1 ring-black/40"
              style={{ minHeight: '60vh' }}
            >
              <button
                onClick={goPrev}
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white rounded-full w-10 h-10 flex items-center justify-center text-2xl font-bold shadow-md transition-transform hover:scale-110"
              >
                &#8249;
              </button>

              <div className="relative w-full" style={{ height: '70vh' }}>
                <Image
                  src={current.url}
                  alt={current.caption || 'Friendly Party Rental event photo'}
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="(max-width: 1152px) 100vw, 1152px"
                  priority
                />
              </div>

              <button
                onClick={goNext}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white rounded-full w-10 h-10 flex items-center justify-center text-2xl font-bold shadow-md transition-transform hover:scale-110"
              >
                &#8250;
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
        <span className="text-body" aria-live="polite">
          {index + 1} / {images.length}
        </span>
        {current.caption && (
          <span className="text-body italic">{current.caption}</span>
        )}
        <button
          onClick={() => setShowThumbs((s) => !s)}
          aria-expanded={showThumbs}
          className="text-blue-700 underline text-sm"
        >
          {showThumbs ? 'Hide thumbnails' : 'Browse all photos'}
        </button>
      </div>

      {showThumbs && (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 mt-4">
          {images.map((img, i) => (
            <button
              key={img.id}
              aria-label={`View photo ${i + 1}${img.caption ? `: ${img.caption}` : ''}`}
              aria-pressed={i === index}
              onClick={() => {
                setIndex(i)
                setShowThumbs(false)
              }}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 shadow-sm transition-all duration-150 hover:scale-105 hover:shadow-lg ${
                i === index ? 'border-amber-400 ring-2 ring-amber-400 shadow-amber-400/50' : 'border-transparent hover:border-amber-200'
              }`}
            >
              <Image
                src={img.url}
                alt={img.caption || `Photo ${i + 1}`}
                fill
                style={{ objectFit: 'cover' }}
                sizes="150px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
