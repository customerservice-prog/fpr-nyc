'use client'
// Redeploy trigger: activate versioned item-image URLs (PR #75)

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useCart } from './CartContext'
import { formatCurrency } from '@/lib/utils'
import { IMAGE_CACHE_BUST } from '@/lib/imageVersion'
import { ImageOff } from 'lucide-react'

interface ItemCardProps {
  id: string
  slug?: string | null
  name: string
  cost: number
  picture?: string | null
  updatedAt?: string | null
  available: number
  pricingProfile?: string
  hideAvailability?: boolean
  isPackage?: boolean
  bookableAfter?: string | null
  bookableAfterMessage?: string | null
  description?: string | null
  colorOptions?: string[]
  priority?: boolean
}

const QUICK_QUANTITIES = [1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 25, 50, 75, 100, 150, 200]

export default function ItemCard({ priority = false, id, slug, name, cost, picture, updatedAt, available, pricingProfile, hideAvailability, isPackage, bookableAfter, bookableAfterMessage, description, colorOptions = [] }: ItemCardProps) {
  const { addItem, items, eventDate } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [isCustom, setIsCustom] = useState(false)
  const [thumbError, setThumbError] = useState(false)
  const [selectedColor, setSelectedColor] = useState('')
    const [showWeatherWarning, setShowWeatherWarning] = useState(false)
    const isPopUpCanopyTent = name.toLowerCase().includes('pop up canopy')
  const [showRestroomWarning, setShowRestroomWarning] = useState(false)
  const isRestroomItem = name.toLowerCase().includes('restroom') || name.toLowerCase().includes('handwashing')

  const handleQuantitySelect = (value: string) => {
    if (value === 'custom') {
      setIsCustom(true)
      return
    }
    setIsCustom(false)
    setQuantity(Number(value))
  }

const onAddClick = () => {
      if (isPopUpCanopyTent) {
              setShowWeatherWarning(true)
                      return
      }
  if (isRestroomItem) {
    setShowRestroomWarning(true)
    return
  }
      handleAdd()
}
  
    const handleAdd = () => {
    if (isPackage && items.some((i) => i.isPackage && i.id !== id)) {
        toast.error('Only one package can be added per order. Please remove the existing package from your cart before adding a different one.')
        return
    }
    if (available <= 0 || (bookableAfter && new Date() < new Date(bookableAfter))) {
        const isBookedOut = bookableAfter ? new Date() < new Date(bookableAfter) : false
      const dateLabel = eventDate ? (() => { const isIso = /^\d{4}-\d{2}-\d{2}$/.test(eventDate); const d = new Date(isIso ? eventDate + 'T00:00:00' : eventDate); return isNaN(d.getTime()) ? eventDate : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) })() : null
      const message = isBookedOut
        ? (dateLabel
            ? 'This item is booked out for your date (' + dateLabel + '). Please choose another date or contact us.'
            : 'This item is booked out for your date. Please choose another date or contact us.')
        : (dateLabel
            ? 'This item is not available for your date (' + dateLabel + '). Please choose another date or contact us.'
            : 'This item is not available for your date. Please choose another date or contact us.')
              toast.error(message)
      return
    }
    if (colorOptions.length > 0 && !selectedColor) { toast.error('Please select a color before adding to cart'); return }; let qty = isPackage ? 1 : quantity
    const cartName = colorOptions.length > 0 ? `${name} (${selectedColor})` : name
    if (!qty || qty < 1) qty = 1
    if (qty > available) {
      qty = available
      toast.error(hideAvailability ? 'Adjusted to the maximum available quantity' : `Only ${available} available - added maximum quantity`)
    }
    addItem({
      id,
      isPackage,
      price: cost,
      maxQuantity: available,
      picture,
      pricingProfile,
      quantity: qty,
      name: cartName,
      selectedColor: colorOptions.length > 0 ? selectedColor : undefined,
      eventDate,
    })
    toast.success(`${cartName} added to cart`)
  }

  const detailHref = slug ? `/items/${slug}` : undefined

  const quantitySelector = isPackage ? null : (
    <div className="flex gap-2 mb-3">
      <select
        className="border rounded px-2 py-1 text-sm flex-1"
        value={isCustom ? 'custom' : String(quantity)}
        onChange={(e) => handleQuantitySelect(e.target.value)}
      >
        {QUICK_QUANTITIES.map((q) => (
          <option key={q} value={q}>{q}</option>
        ))}
        <option value="custom">Custom...</option>
      </select>
      {isCustom && (
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
          className="border rounded px-2 py-1 text-sm w-20"
        />
      )}
    </div>
  )

  const thumb = (
    <div className="aspect-square bg-gray-100 relative overflow-hidden">
      {(slug || picture) && !thumbError ? (
      <Image src={slug ? `/api/item-image/${slug}?v=${updatedAt || IMAGE_CACHE_BUST}` : picture!} alt={name} fill {...(priority ? { priority: true } : { loading: 'lazy' as const })} className="object-contain" sizes="(max-width: 768px) 50vw, 250px" onError={() => setThumbError(true)} />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex flex-col items-center justify-center gap-1 text-gray-400">
          <ImageOff className="w-7 h-7" />
          <span className="text-[10px] font-medium">Photo coming soon</span>
        </div>
      )}
    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/40 text-white text-[10px] leading-none rounded pointer-events-none select-none">Friendly Party Rental</div>
    </div>
  )

  return (
        <>
        <div className="category-card bg-white">
      {detailHref ? (
        <Link href={detailHref} prefetch={false} className="block cursor-pointer">
          {thumb}
        </Link>
      ) : thumb}
      <div className="p-4">
        {detailHref ? (
          <Link href={detailHref} prefetch={false} className="block">
            <h3 className="font-medium text-dark text-sm mb-1 hover:underline">
              {name}
            </h3>
</Link>
        ) : (
          <h3 className="font-medium text-dark text-sm mb-1">{name}</h3>
        )}
        <p className="text-secondary font-bold text-lg mb-1">{formatCurrency(cost)}<span className="text-xs text-body font-normal">/day</span></p>
        {!hideAvailability && (
          <p className="text-xs text-body mb-3">
            {available > 0 ? `${available} available` : 'Unavailable'}
          </p>
        )}
        {hideAvailability && (
          <p className="text-xs text-body mb-3">
            {available > 0 ? 'In stock' : 'Out of stock'}
          </p>
        )}
        {colorOptions.length > 0 && (<div className="mb-2"><label className="text-xs text-body" htmlFor={`color-${id}`}>Color:</label><select id={`color-${id}`} className="border rounded px-2 py-1 text-sm w-full mt-1" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)}><option value="">Select a color...</option>{colorOptions.map((c) => (<option key={c} value={c}>{c}</option>))}</select></div>)}{quantitySelector}
        <button
          onClick={onAddClick}
          disabled={colorOptions.length > 0 && !selectedColor} className="btn-primary w-full text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add to Cart
        </button>
      </div>
    </div>
    {showWeatherWarning && (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowWeatherWarning(false)}>
    <div className="bg-white rounded-lg max-w-md w-full p-6 relative shadow-xl" onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setShowWeatherWarning(false)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
      <h2 className="text-xl font-bold text-dark mb-1">Weather Advisory</h2>
      <p className="text-sm text-gray-700 mb-3">Please note before booking this pop-up canopy tent:</p>
      <ul className="text-sm text-gray-700 list-disc pl-4 space-y-1 mb-4">
        <li>This rental may be cancelled if a storm or severe weather is forecasted</li>
        <li>You are responsible for taking the canopy down if winds become too strong</li>
        <li>For something secure in all weather, consider a pole tent or frame tent instead</li>
      </ul>
      <div className="flex gap-3">
        <button onClick={() => setShowWeatherWarning(false)} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
        <button onClick={() => { setShowWeatherWarning(false); handleAdd() }} className="flex-1 btn-primary py-2 text-sm">I Understand, Add to Cart</button>
      </div>
    </div>
  </div>
)}
      {showRestroomWarning && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowRestroomWarning(false)}>
            <div className="bg-white rounded-lg max-w-md w-full p-6 relative shadow-xl" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowRestroomWarning(false)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            <h2 className="text-xl font-bold text-dark mb-1">Please Call Before Booking</h2>
            <p className="text-sm text-gray-700 mb-3">Our restroom rentals book up quickly and are available in limited quantity. Please call us at 864-610-5324 to confirm availability before booking to avoid disappointment.</p>
            <div className="flex gap-3">
            <button onClick={() => setShowRestroomWarning(false)} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button onClick={() => { setShowRestroomWarning(false); handleAdd() }} className="flex-1 btn-primary py-2 text-sm">I Understand, Add to Cart</button>
            </div>
            </div>
          </div>
        )}
        </>
  )
}
