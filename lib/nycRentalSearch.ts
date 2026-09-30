/** Shared, read-only rental-search transport. No orders, prices or stock are written. */
export interface RentalSearchItem {
  id: string
  name: string
  slug: string
  cost: number | null
  category: { name: string } | null
}

export interface RentalSearchState {
  query: string
  status: 'idle' | 'loading' | 'success' | 'error'
  items: RentalSearchItem[]
  error: string | null
}

export const RENTAL_SEARCH_ERROR = 'We could not load rentals right now. Please try again.'

export function emptyRentalSearch(query = '', status: RentalSearchState['status'] = 'idle'): RentalSearchState {
  return { query, status, items: [], error: null }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRoutableSlug(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim()
    && !['.', '..', 'null', 'undefined'].includes(value.toLowerCase())
    && !/[\\/?#%\u0000-\u0020\u007f]/.test(value)
}

/** Normalize either supported API shape without creating dead '#' item links. */
export function parseRentalSearchResponse(payload: unknown): RentalSearchItem[] {
  const rows = Array.isArray(payload) ? payload : isRecord(payload) ? payload.items : null
  if (!Array.isArray(rows)) throw new Error('Invalid rental search response')
  const ids = new Set<string>()
  const slugs = new Set<string>()
  const items: RentalSearchItem[] = []
  for (const row of rows) {
    if (!isRecord(row) || typeof row.id !== 'string' || !row.id.trim()
      || typeof row.name !== 'string' || !row.name.trim()) {
      throw new Error('Invalid rental search item')
    }
    // A published record without a real public slug cannot open an item page.
    if (!isRoutableSlug(row.slug) || ids.has(row.id) || slugs.has(row.slug)) continue
    const category = isRecord(row.category) && typeof row.category.name === 'string'
      && row.category.name.trim() ? { name: row.category.name.trim() } : null
    items.push({
      id: row.id,
      name: row.name.trim(),
      slug: row.slug,
      cost: typeof row.cost === 'number' && Number.isFinite(row.cost) && row.cost >= 0 ? row.cost : null,
      category,
    })
    ids.add(row.id)
    slugs.add(row.slug)
    if (items.length === 8) break
  }
  return items
}

// Same public item URL rule as lib/nycItemPath.ts (kept inline: this module has no imports).
const MARKET_SUFFIX = /-(?:syracuse|minoa|cny|central-new-york)(?:-ny)?$/i

export function rentalItemHref(item: Pick<RentalSearchItem, 'slug'>): string {
  if (!isRoutableSlug(item.slug)) throw new Error('Invalid rental item slug')
  return `/items/${encodeURIComponent(item.slug.replace(MARKET_SUFFIX, '') || item.slug)}`
}

export interface RentalSearchOptions {
  debounceMs?: number
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

/**
 * A disposed/aborted request may never publish results OR a loading-state update.
 * This covers fetch implementations which still resolve after AbortController.abort().
 */
export function startRentalSearch(
  rawQuery: string,
  publish: (state: RentalSearchState) => void,
  options: RentalSearchOptions = {},
): () => void {
  const query = rawQuery.trim()
  if (query.length < 2) {
    publish(emptyRentalSearch(query))
    return () => {}
  }
  const fetchImpl = options.fetchImpl ?? fetch
  const controller = new AbortController()
  let disposed = false
  let settled = false
  let timeout: ReturnType<typeof setTimeout> | undefined
  publish(emptyRentalSearch(query, 'loading'))

  function finish(state: RentalSearchState) {
    if (disposed || settled) return
    settled = true
    clearTimeout(timeout)
    publish(state)
  }

  const debounce = setTimeout(async () => {
    if (disposed) return
    timeout = setTimeout(() => {
      controller.abort()
      finish({ ...emptyRentalSearch(query, 'error'), error: RENTAL_SEARCH_ERROR })
    }, options.timeoutMs ?? 10_000)
    try {
      const response = await fetchImpl(`/api/items?search=${encodeURIComponent(query)}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })
      if (!response.ok) throw new Error('Rental search unavailable')
      const items = parseRentalSearchResponse(await response.json())
      finish({ query, status: 'success', items, error: null })
    } catch {
      finish({ ...emptyRentalSearch(query, 'error'), error: RENTAL_SEARCH_ERROR })
    }
  }, options.debounceMs ?? 250)

  return () => {
    disposed = true
    clearTimeout(debounce)
    clearTimeout(timeout)
    controller.abort()
  }
}

/** Hide the previous query's matches immediately, before React runs effect cleanup. */
export function visibleRentalSearchState(
  rawQuery: string,
  enabled: boolean,
  state: RentalSearchState,
): RentalSearchState {
  const query = rawQuery.trim()
  if (!enabled || query.length < 2) return emptyRentalSearch(query)
  return state.query === query ? state : emptyRentalSearch(query, 'loading')
}
