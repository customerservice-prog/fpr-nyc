'use client'

import Link from 'next/link'
import { useCart } from './CartContext'
import toast from 'react-hot-toast'

export interface SuggestedAddon {
  id: string
  name: string
  slug: string
  description?: string | null
  cost: number
  picture?: string | null
  quantity: number
}

export default function SuggestedAddons({ addons }: { addons: SuggestedAddon[] }) {
  const { addItem } = useCart()

  if (!addons || addons.length === 0) return null

  const handleAdd = (addon: SuggestedAddon) => {
    addItem({
      id: addon.id,
      name: addon.name,
      price: addon.cost,
      maxQuantity: addon.quantity,
      picture: addon.picture || undefined,
      pricingProfile: 'standard',
      isPackage: false,
    })
    toast.success(`${addon.name} added to cart`)
  }

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <span className="text-xl">✨</span> Frequently Added With This
        </h3>
        <p className="mt-1 text-sm text-gray-500">Popular add-ons that pair perfectly with this rental</p>
      </div>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
        {addons.slice(0, 3).map((addon) => (
          <div
            key={addon.id}
            className="group flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:border-amber-200"
          >
            <Link href={`/items/${addon.slug}`} className="block aspect-[4/3] w-full overflow-hidden rounded-t-2xl bg-amber-50">
              {addon.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={addon.picture}
                  alt={addon.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100 text-4xl">
                  🎉
                </div>
              )}
            </Link>
            <div className="flex flex-1 flex-col p-4">
              <Link href={`/items/${addon.slug}`} className="font-semibold text-gray-900 hover:text-amber-600">
                {addon.name}
              </Link>
              {addon.description && (
                <p className="mt-1 line-clamp-2 flex-1 text-xs text-gray-500">{addon.description}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-base font-bold text-amber-700">${addon.cost.toFixed(2)}</span>
                <button
                  type="button"
                  onClick={() => handleAdd(addon)}
                  className="shrink-0 whitespace-nowrap rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-600 hover:shadow-md"
                >
                  + Add
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
