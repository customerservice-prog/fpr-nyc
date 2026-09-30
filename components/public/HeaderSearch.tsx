'use client'

import { useState, useEffect, useRef, useId } from 'react'
import type { KeyboardEvent } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { IMAGE_CACHE_BUST } from '@/lib/imageVersion'
import { useRentalSearch } from '@/lib/useRentalSearch'
import { rentalItemHref } from '@/lib/nycRentalSearch'

export default function HeaderSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const search = useRentalSearch(query, open)
  const pathname = usePathname()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsId = useId()
  const showDropdown = open && query.trim().length >= 2

  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [])

  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      event.stopPropagation()
      inputRef.current?.focus()
      setOpen(false)
      return
    }
    if (!showDropdown || !['ArrowDown', 'ArrowUp'].includes(event.key)) return
    const links = Array.from(containerRef.current?.querySelectorAll<HTMLAnchorElement>('[data-rental-search-result]') ?? [])
    if (links.length === 0) return
    const index = links.findIndex(link => link === document.activeElement)
    if (event.target === inputRef.current) {
      event.preventDefault()
      links[event.key === 'ArrowDown' ? 0 : links.length - 1].focus()
    } else if (index >= 0) {
      event.preventDefault()
      if (event.key === 'ArrowUp' && index === 0) inputRef.current?.focus()
      else links[(index + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length].focus()
    }
  }

  return (
    <div className="w-full bg-white border-t border-gray-100">
      <div className="max-w-3xl mx-auto px-4 py-3">
        <div ref={containerRef} className="relative" role="search" aria-label="Find rental equipment"
          onKeyDown={keyboard}
          onBlur={(event) => {
            if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setOpen(false)
          }}>
          <div className="flex items-center border border-gray-300 rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary bg-white">
            <Search size={18} className="text-gray-400 shrink-0" aria-hidden="true" />
            <input ref={inputRef} type="search" value={query} autoComplete="off" spellCheck={false}
              onChange={(event) => { setQuery(event.target.value); setOpen(true) }}
              onFocus={() => setOpen(true)} placeholder="Search for any item..." aria-label="Search rental items"
              aria-controls={showDropdown ? resultsId : undefined}
              className="w-full min-w-0 ml-2 outline-none text-sm text-dark bg-transparent" />
            {query && <button type="button" aria-label="Clear search"
              onClick={() => { setQuery(''); inputRef.current?.focus() }}
              className="text-gray-400 hover:text-gray-600 shrink-0 p-1">
              <X size={16} aria-hidden="true" />
            </button>}
          </div>

          {showDropdown && <div id={resultsId} aria-busy={search.status === 'loading'}
            className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
            {search.status === 'loading' && <p role="status" className="px-4 py-3 text-sm text-gray-500">Searching...</p>}
            {search.status === 'error' && <div className="px-4 py-3 text-sm text-gray-700">
              <p role="alert">{search.error}</p>
              <button type="button" onClick={search.retry} className="mt-2 font-semibold text-primary underline">Try again</button>
              <Link href="/category" prefetch={false} onClick={() => setOpen(false)} className="ml-4 underline">Browse rentals</Link>
            </div>}
            {search.status === 'success' && search.items.length === 0 && <p role="status" className="px-4 py-3 text-sm text-gray-500">
              No items found for &quot;{query.trim()}&quot;.
            </p>}
            {search.status === 'success' && search.items.length > 0 && <>
              <p role="status" className="sr-only">{search.items.length} rental results.</p>
              <ul aria-label="Rental search results">{search.items.map(item => <li key={item.id}>
                <Link href={rentalItemHref(item)} prefetch={false} data-rental-search-result
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-gray-50 focus-visible:bg-gray-50 border-b border-gray-100 last:border-b-0">
                  <div className="w-10 h-10 shrink-0 rounded overflow-hidden bg-gray-100">
                    <img src={`/api/item-image/${encodeURIComponent(item.slug)}?v=${IMAGE_CACHE_BUST}`} alt=""
                      loading="lazy" decoding="async" className="w-full h-full object-cover"
                      onError={event => { event.currentTarget.style.display = 'none' }} />
                  </div>
                  <span className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-dark truncate">{item.name}</span>
                    {item.category && <span className="text-xs text-gray-400 truncate">{item.category.name}</span>}
                  </span>
                  {item.cost !== null && item.cost > 0 && <span className="text-sm text-primary font-semibold shrink-0">${item.cost.toFixed(2)}</span>}
                </Link>
              </li>)}</ul>
            </>}
          </div>}
        </div>
      </div>
    </div>
  )
}
