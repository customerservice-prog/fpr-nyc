'use client'

import { useState } from 'react'
import { IMAGE_CACHE_BUST } from '@/lib/imageVersion'

interface ItemGalleryProps {
  slug: string
  name: string
  hasPicture: boolean
  additionalImages: string[]
}

export default function ItemGallery({ slug, name, hasPicture, additionalImages }: ItemGalleryProps) {
  const mainImageSrc = `/api/item-image/${slug}?v=${IMAGE_CACHE_BUST}`
  const images = hasPicture ? [mainImageSrc, ...additionalImages] : additionalImages
  const [activeImage, setActiveImage] = useState<string | null>(images[0] || null)

  if (!activeImage) {
    return (
      <div className="w-full aspect-square rounded-lg border bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
        <span className="text-5xl">📦</span>
      </div>
    )
  }

  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={activeImage}
        alt={`${name} rental in Syracuse, NY`}
        className="w-full rounded-lg object-cover border"
      />
      {images.length > 1 && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setActiveImage(src)}
              className={`w-16 h-16 rounded-md overflow-hidden border-2 ${activeImage === src ? 'border-blue-600' : 'border-gray-200'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${name} view ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
