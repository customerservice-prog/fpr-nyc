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
  const [availabilityError, setAvailabilityError] = useState('')
  const [retry, setRetry] = useState(0)
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
    const controller = new AbortController()
    let active = true
    const timeout = window.setTimeout(() => controller.abort(), 12000)
    setLoading(true)
    setAvailabilityError('')
    setItems([])
    const params = new URLSearchParams({ date })
    if (category) params.set('category', category)
    fetch(`/api/items?${params}`, { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('Availability could not be checked.')
        const data = await response.json()
        if (!Array.isArray(data.items)) throw new Error('Availability could not be checked.')
        if (active) setItems(data.items.filter((item: { available: number }) => Number(item.available) > 0))
      })
      .catch(() => {
        if (active) setAvailabilityError(controller.signal.aborted
          ? 'The availability check timed out. Please try again.'
          : 'We could not check rental availability. Please try again or contact our NYC team.')
      })
      .finally(() => {
        window.clearTimeout(timeout)
        if (active) setLoading(false)
      })
    return () => { active = false; window.clearTimeout(timeout); controller.abort() }
  }, [date, category, retry])

  if (!date) {
    return (
      <div className="text-center py-12">
        <h1 className="mb-3 text-2xl font-bold text-dark">Choose Your Event Date</h1>
        <p className="text-body mb-4">Please select an event date first.</p>
        <a href="/order-by-date" className="btn-primary inline-block">Pick My Date</a>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
      <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-4 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your Event</p>
          <h1 className="mt-1 text-2xl font-bold text-dark">Pick Your Rentals</h1>
          <p className="mt-1 text-sm text-body"><strong>{date}</strong> • Showing rentals available for your date</p>
          <a href="/order-by-date" className="mt-2 inline-block text-sm font-semibold text-blue-700 underline">Change Date</a>
        </div>
        <button
          onClick={() => setCartOpen(true)}
          className="btn-primary mt-4 flex w-full items-center justify-center gap-2 sm:mt-0 sm:w-auto"
        >
          <ShoppingCart size={20} />
          Cart ({itemCount})
        </button>
      </div>

      {loading ? (
        <p role="status" className="text-center text-body py-12">Checking rental availability...</p>
      ) : availabilityError ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          <p>{availabilityError}</p>
          <button type="button" onClick={() => setRetry(attempt => attempt + 1)} className="mt-3 min-h-11 font-semibold underline">Try again</button>
          <a href="/contact_us" className="ml-5 inline-flex min-h-11 items-center font-semibold underline">Contact us</a>
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-body">
          <p>No rentals are available for this date.</p>
          <a href="/order-by-date" className="mt-3 inline-flex min-h-11 items-center font-semibold text-blue-700 underline">Choose another date</a>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm font-medium text-slate-600 md:hidden">Available rental categories for your date</p>
          <div className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {(() => {
              const available = new Map<string, { name: string; slug: string }>()
              for (const item of items) {
                const slug = item.category?.slug || 'other'
                if (!available.has(slug)) available.set(slug, { name: item.category?.name || 'Other Rentals', slug })
              }
              const ordered = [
                ...PUBLIC_CATEGORIES.filter(reference => reference.slug !== 'order-by-date' && available.has(reference.slug)).map(reference => available.get(reference.slug)!),
                ...Array.from(available.values()).filter(info => !PUBLIC_CATEGORIES.some(reference => reference.slug === info.slug)),
              ]
              return ordered.map(info => <div key={info.slug} className="min-w-0"><CategoryCard
                name={info.name}
                href={`/category/${encodeURIComponent(info.slug)}?${new URLSearchParams({ date })}`}
                image={pictures[info.slug] || PUBLIC_CATEGORIES.find(reference => reference.slug === info.slug)?.image}
              /></div>)
            })()}
          </div>
        </>
      )}

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  )
}

export default function ItemsClient() {
  return (
    <Suspense fallback={<p className="text-center py-12">Loading...</p>}>
      <ItemsContent />
    </Suspense>
  )
}
