'use client'

import { useEffect, useState } from 'react'
import CategoryCard from '@/components/public/CategoryCard'
import { PUBLIC_CATEGORIES } from '@/lib/utils'

export default function CategoryPage() {
  const [search, setSearch] = useState('')
  const [pictures, setPictures] = useState<Record<string, string>>({})

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

  const filtered = PUBLIC_CATEGORIES.filter(
    (c) => c.slug !== 'order-by-date' && c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <h1 className="text-3xl font-bold text-dark">Browse All Rentals</h1>
        <input
          type="search"
          placeholder="Search categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search rental categories" className="border rounded px-4 py-2 text-sm w-full sm:w-64"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {filtered.map((cat) => (
          <CategoryCard key={cat.slug} name={cat.name} href={cat.href} image={pictures[cat.slug] || cat.image} />
        ))}
      </div>
    </div>
  )
}
