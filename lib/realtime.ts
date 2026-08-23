// In-memory realtime visitor tracking.
//
// This is a first-party, self-hosted alternative to Google Analytics' realtime
// report. It keeps a rolling buffer of recent page-view "hits" in server memory
// (no database table required) so the admin dashboard can show how many people
// are on the site right now, over the last 30 minutes, and so far today.
//
// Notes / limitations (by design):
//  - Data lives in the Node process memory, so it resets on redeploy/restart.
//    That's fine for a live "who's online now" view and today's rolling counts.
//  - On a multi-instance deployment each instance keeps its own buffer. The app
//    currently runs as a single instance on Railway, so this is accurate there.

export interface Hit {
  visitorId: string
  path: string
  referrer: string | null
  city: string | null
  region: string | null
  country: string | null
  device: 'mobile' | 'tablet' | 'desktop'
  ts: number
}

interface Store {
  hits: Hit[]
  // Rolling count of unique visitors seen "today" (site local day).
  dayKey: string
  dayVisitors: Set<string>
  dayPageviews: number
}

const RETENTION_MS = 30 * 60 * 1000 // keep 30 minutes of hits in memory
const ACTIVE_WINDOW_MS = 5 * 60 * 1000 // "active now" = seen in last 5 minutes

// Persist the store across hot-reloads in dev and across module reloads.
const g = globalThis as unknown as { __fprRealtime?: Store }

function dayKeyFor(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function getStore(): Store {
  if (!g.__fprRealtime) {
    g.__fprRealtime = {
      hits: [],
      dayKey: dayKeyFor(new Date()),
      dayVisitors: new Set<string>(),
      dayPageviews: 0,
    }
  }
  return g.__fprRealtime
}

function rollDay(store: Store, now: Date) {
  const key = dayKeyFor(now)
  if (key !== store.dayKey) {
    store.dayKey = key
    store.dayVisitors = new Set<string>()
    store.dayPageviews = 0
  }
}

function prune(store: Store, now: number) {
  const cutoff = now - RETENTION_MS
  if (store.hits.length && store.hits[0].ts < cutoff) {
    store.hits = store.hits.filter((h) => h.ts >= cutoff)
  }
}

export function recordHit(hit: Omit<Hit, 'ts'>): void {
  const store = getStore()
  const now = new Date()
  rollDay(store, now)
  const ts = now.getTime()
  store.hits.push({ ...hit, ts })
  store.dayVisitors.add(hit.visitorId)
  store.dayPageviews += 1
  prune(store, ts)
}

export interface RealtimeSnapshot {
  activeNow: number
  pageviewsLast30Min: number
  perMinute: { minute: string; users: number }[]
  topPages: { path: string; users: number }[]
  byCity: { city: string; users: number }[]
  byDevice: { device: string; users: number }[]
  todayVisitors: number
  todayPageviews: number
  generatedAt: number
}

export function getSnapshot(): RealtimeSnapshot {
  const store = getStore()
  const now = Date.now()
  rollDay(store, new Date())
  prune(store, now)

  const activeCutoff = now - ACTIVE_WINDOW_MS
  const recent = store.hits.filter((h) => h.ts >= activeCutoff)

  const activeVisitors = new Set(recent.map((h) => h.visitorId))

  // Users per minute over the last 30 minutes (unique visitors per minute).
  const perMinuteMap = new Map<string, Set<string>>()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 60 * 1000)
    const label = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
    perMinuteMap.set(label, new Set<string>())
  }
  for (const h of store.hits) {
    const d = new Date(h.ts)
    const label = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
    const bucket = perMinuteMap.get(label)
    if (bucket) bucket.add(h.visitorId)
  }
  const perMinute = Array.from(perMinuteMap.entries()).map(([minute, set]) => ({ minute, users: set.size }))

  const groupUnique = (key: (h: Hit) => string | null) => {
    const m = new Map<string, Set<string>>()
    for (const h of recent) {
      const k = key(h)
      if (!k) continue
      if (!m.has(k)) m.set(k, new Set<string>())
      m.get(k)!.add(h.visitorId)
    }
    return Array.from(m.entries())
      .map(([k, set]) => ({ key: k, users: set.size }))
      .sort((a, b) => b.users - a.users)
  }

  const topPages = groupUnique((h) => h.path).slice(0, 8).map((r) => ({ path: r.key, users: r.users }))
  const byCity = groupUnique((h) => h.city).slice(0, 8).map((r) => ({ city: r.key, users: r.users }))
  const byDevice = groupUnique((h) => h.device).map((r) => ({ device: r.key, users: r.users }))

  return {
    activeNow: activeVisitors.size,
    pageviewsLast30Min: store.hits.length,
    perMinute,
    topPages,
    byCity,
    byDevice,
    todayVisitors: store.dayVisitors.size,
    todayPageviews: store.dayPageviews,
    generatedAt: now,
  }
}
