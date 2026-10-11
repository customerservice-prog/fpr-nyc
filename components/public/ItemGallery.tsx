'use client'

import { useState } from 'react'
import Image from 'next/image'

interface ItemGalleryProps {
  slug: string
  name: string
  hasPicture: boolean
  /** Number of additional photos (served as /api/item-image/<slug>?index=N). */
  additionalImageCount: number
  /** Cache-busting version (the item's last update time). */
  version: string
}

export default function ItemGallery({ slug, name, hasPicture, additionalImageCount, version }: ItemGalleryProps) {
  const base = `/api/item-image/${encodeURIComponent(slug)}`
  const v = encodeURIComponent(version)
  const images = [
    ...(hasPicture ? [`${base}?v=${v}`] : []),
    ...Array.from({ length: Math.max(0, additionalImageCount) }, (_, index) => `${base}?index=${index}&v=${v}`),
  ]
  const [activeImage, setActiveImage] = useState<string | null>(images[0] || null)
  const [failedImage, setFailedImage] = useState<string | null>(null)

  if (!activeImage) return <div className="w-full aspect-square rounded-lg border bg-gray-50 grid place-items-center"><span className="text-sm text-gray-500">Photo not yet supplied. Contact us for item details.</span></div>
  return <div>
    <div className="relative aspect-square w-full overflow-hidden rounded-lg border bg-white">
      {failedImage === activeImage
        ? <div className="flex h-full items-center justify-center text-gray-500">Photo unavailable</div>
        : <Image key={activeImage} src={activeImage} alt={`${name} rental in Riverdale, NY`} fill priority sizes="(max-width: 767px) calc(100vw - 32px), 432px" className="object-contain" onError={() => setFailedImage(activeImage)} />}
    </div>
    {images.length > 1 && <div className="flex gap-2 mt-3 flex-wrap">{images.map((src, i) => <button key={src} type="button" aria-label={`View ${name} photo ${i + 1}`} aria-pressed={activeImage === src} onClick={() => { setActiveImage(src); setFailedImage(null) }} className={`relative w-16 h-16 rounded-md overflow-hidden border-2 ${activeImage === src ? 'border-blue-600' : 'border-gray-200'}`}><Image src={src} alt={`${name} photo ${i + 1}`} fill sizes="64px" loading="lazy" className="object-cover" /></button>)}</div>}
  </div>
}
