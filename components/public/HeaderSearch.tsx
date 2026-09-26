'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Search, X } from 'lucide-react'

import { IMAGE_CACHE_BUST } from '@/lib/imageVersion'
interface SearchItem {
  id: string
  name: string
  slug: string | null
  cost: number | null
  category?: { name: string | null } | null
}

export default function HeaderSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchItem[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Debounced fetch. Uses the public /api/items endpoint, which only
  // returns items with displayToCustomer = true, so hidden / non-displayed
  // items never appear in search results.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/items?search=${encodeURIComponent(q)}`,
          { signal: controller.signal }
        )
        if (!res.ok) throw new Error('search failed')
        const data = await res.json()
        const items: SearchItem[] = Array.isArray(data)
          ? data
          : data.items || []
        setResults(items.slice(0, 8))
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [query])

  // Close the dropdown when clicking outside the search area.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const showDropdown = open && query.trim().length >= 2

  return (
    <div className="w-full bg-white border-t border-gray-100">
      <div className="max-w-3xl mx-auto px-4 py-3">
        <div ref={containerRef} className="relative">
          <div className="flex items-center border border-gray-300 rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary bg-white">
            <Search size={18} className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              placeholder="Search for any item..."
              aria-label="Search rental items"
              className="w-full ml-2 outline-none text-sm text-dark bg-transparent"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQuery('')
                  setResults([])
                }}
                className="text-gray-400 hover:text-gray-600 shrink-0"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {showDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
              {loading && results.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">
                  Searching...
                </div>
              ) : results.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">
                  No items found for &quot;{query.trim()}&quot;
                </div>
              ) : (
                <ul>
                  {results.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.slug ? `/items/${item.slug}` : '#'}
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="w-10 h-10 shrink-0 rounded overflow-hidden bg-gray-100">
                          {item.slug && (
                            <img
                src={`/api/item-image/${item.slug}?v=${IMAGE_CACHE_BUST}`}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                            />
                          )}
                        </div>
                        <span className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-dark truncate">
                            {item.name}
                          </span>
                          {item.category?.name && (
                            <span className="text-xs text-gray-400 truncate">
                              {item.category.name}
                            </span>
                          )}
                        </span>
                        {typeof item.cost === 'number' && item.cost > 0 && (
                          <span className="text-sm text-primary font-semibold shrink-0">
                            ${item.cost.toFixed(2)}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
