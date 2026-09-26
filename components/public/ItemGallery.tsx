'use client'

import { useEffect, useState } from 'react'
import { IMAGE_CACHE_BUST } from '@/lib/imageVersion'
import { NYC_ITEM_MEDIA } from '@/lib/nycItemMedia'

interface ItemGalleryProps {
  slug: string
  name: string
  hasPicture: boolean
  additionalImages: string[]
}

export default function ItemGallery({ slug, name, hasPicture, additionalImages }: ItemGalleryProps) {
  const mainImageSrc = `/api/item-image/${slug}?v=${IMAGE_CACHE_BUST}`
  const images = hasPicture || NYC_ITEM_MEDIA[slug] ? [mainImageSrc, ...additionalImages] : additionalImages
  const [activeImage, setActiveImage] = useState<string | null>(images[0] || null)
  const [reference, setReference] = useState(false)
  // The route protects subsequent admin uploads. Read its actual response marker
  // rather than permanently labeling a newer, exact product photo as a reference.
  useEffect(() => {
    setReference(false)
    if (!NYC_ITEM_MEDIA[slug]) return
    const controller = new AbortController()
    fetch(mainImageSrc, { method: 'HEAD', signal: controller.signal })
      .then(response => { if (!controller.signal.aborted) setReference(response.ok && response.headers.has('X-Image-Reference')) })
      .catch(() => {})
    return () => controller.abort()
  }, [slug, mainImageSrc])

  if (!activeImage) return <div className="w-full aspect-square rounded-lg border bg-gray-50 grid place-items-center"><span className="text-sm text-gray-500">Photo not yet supplied. Contact us for item details.</span></div>
  return <div>
    <img src={activeImage} alt={`${name} — see image caption for any style, size or color reference`} className="w-full rounded-lg object-contain border" />
    {reference && activeImage === mainImageSrc && <p data-image-reference="true" className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm leading-6 text-gray-700"><strong>Reference preview.</strong> This image may show a related style, size, color or equipment combination rather than the exact item. Read the caption in the image and the listed product details. Package quantities and included models are defined by the written offer.</p>}
    {images.length > 1 && <div className="flex gap-2 mt-3 flex-wrap">{images.map((src, i) => <button key={src + i} type="button" aria-label={`View ${name} image ${i + 1}`} onClick={() => setActiveImage(src)} className={`w-16 h-16 rounded-md overflow-hidden border-2 ${activeImage === src ? 'border-blue-600' : 'border-gray-200'}`}><img src={src} alt={`${name} view ${i + 1}`} className="w-full h-full object-cover" /></button>)}</div>}
  </div>
}
