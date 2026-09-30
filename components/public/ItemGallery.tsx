'use client'

import { useState } from 'react'

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

  if (!activeImage) return <div className="w-full aspect-square rounded-lg border bg-gray-50 grid place-items-center"><span className="text-sm text-gray-500">Photo not yet supplied. Contact us for item details.</span></div>
  return <div>
    <img src={activeImage} alt={name} className="w-full rounded-lg object-contain border" />
    {images.length > 1 && <div className="flex gap-2 mt-3 flex-wrap">{images.map((src, i) => <button key={src} type="button" aria-label={`View ${name} photo ${i + 1}`} onClick={() => setActiveImage(src)} className={`w-16 h-16 rounded-md overflow-hidden border-2 ${activeImage === src ? 'border-blue-600' : 'border-gray-200'}`}><img src={src} alt={`${name} photo ${i + 1}`} className="w-full h-full object-cover" /></button>)}</div>}
  </div>
}
