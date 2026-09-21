'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { SC_SHARED_GALLERY } from '@/lib/scSharedGallery'

interface GalleryImage {
  id: string
  url: string
  caption?: string | null
}

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [shared, setShared] = useState(false)
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(0)
  const [showThumbs, setShowThumbs] = useState(false)

  useEffect(() => {
    fetch('/api/gallery')
      .then((res) => res.json())
      .then((data) => {
        const local = data.images || []
        setShared(local.length === 0)
        setImages(local.length ? local : SC_SHARED_GALLERY)
        setLoading(false)
      })
      .catch(() => {setImages(SC_SHARED_GALLERY);setShared(true);setLoading(false)})
  }, [])

  const goNext = useCallback(() => {
    setIndex((i) => (images.length ? (i + 1) % images.length : 0))
  }, [images.length])

  const goPrev = useCallback(() => {
    setIndex((i) => (images.length ? (i - 1 + images.length) % images.length : 0))
  }, [images.length])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [goNext, goPrev])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-body">
        Loading gallery…
      </div>
    )
  }

  if (!images.length) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-body">
        No photos yet. Check back soon!
      </div>
    )
  }

  const current = images[index]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-1">Gallery</h1>
      <div className="mx-auto mb-3 h-1 w-24 rounded-full bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300" />
      <p className="text-center text-body mb-2">
        {shared ? "Shared Brand Gallery & Event Inspiration" : "Real Events, Real Setups, Real Smiles"}
      </p>
      <p className="text-center text-body mb-6">
        {shared ? "From Friendly Party Rental’s New York website. These are shared photos and design inspiration, not Greenville event photos. Equipment and availability may differ by location." : "Browse photos from birthdays, weddings, graduations and events shared by our Greenville team."}
      </p>

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
                  style={{ objectFit: 'contain' }}
                  sizes="100vw"
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
        <span className="text-body">
          {index + 1} / {images.length}
        </span>
        {current.caption && (
          <span className="text-body italic">{current.caption}</span>
        )}
        <button
          onClick={() => setShowThumbs((s) => !s)}
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
