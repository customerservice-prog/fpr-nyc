'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import CategoryCard from '@/components/public/CategoryCard'
import { PUBLIC_CATEGORIES } from '@/lib/utils'
import CartDrawer from '@/components/public/CartDrawer'
import { useCart } from '@/components/public/CartContext'
import { ShoppingCart } from 'lucide-react'

function ItemsContent() {
  const searchParams = useSearchParams()
  const date = searchParams.get('date')
  const category = searchParams.get('category')
  const [items, setItems] = useState<Array<{
    id: string
    name: string
    cost: number
    picture?: string | null
    available: number
    category?: { name: string; slug: string } | null
  }>>([])
  const [loading, setLoading] = useState(true)
  const [cartOpen, setCartOpen] = useState(false)
  const [pictures, setPictures] = useState<Record<string, string>>({})
  const { setEventDate, itemCount } = useCart()

  useEffect(() => {
    if (date) setEventDate(date)
  }, [date, setEventDate])

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, string> = {}
        ;(d.categories || []).forEach((c: { slug: string; picture?: string | null }) => {
          if (c.picture) map[c.slug] = c.picture
        })
        setPictures(map)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!date) return
    setLoading(true)
    const params = new URLSearchParams({ date })
    if (category) params.set('category', category)
    fetch(`/api/items?${params}`)
      .then((r) => r.json())
      .then((data) => setItems(data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [date, category])

  if (!date) {
    return (
      <div className="text-center py-12">
        <p className="text-body mb-4">Please select an event date first.</p>
        <a href="/order-by-date" className="btn-primary inline-block">Select Date</a>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-dark">Available Rentals</h1>
          <p className="text-body">Event Date: {date}</p>
        </div>
        <button
          onClick={() => setCartOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <ShoppingCart size={20} />
          Cart ({itemCount})
        </button>
      </div>

      {loading ? (
        <p className="text-center text-body py-12">Loading items...</p>
      ) : items.length === 0 ? (
        <p className="text-center text-body py-12">No items available for this date.</p>
      ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(
            items.reduce((groups: Record<string, { slug: string }>, item) => {
              const catName = item.category?.name || 'Other Rentals'
                const catSlug = item.category?.slug || 'other'
                  if (!groups[catName]) groups[catName] = { slug: catSlug }
                    return groups
            }, {} as Record<string, { slug: string }>)
            ).map(([categoryName, info]) => (
            <CategoryCard
              key={categoryName}
              name={categoryName}
              href={`/category/${info.slug}?date=${date}`}
              image={pictures[info.slug] || PUBLIC_CATEGORIES.find((c) => c.slug === info.slug)?.image}
              />
            ))}
          </div>
      )}

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  )
}

export default function ItemsPage() {
  return (
    <Suspense fallback={<p className="text-center py-12">Loading...</p>}>
      <ItemsContent />
    </Suspense>
  )
}
