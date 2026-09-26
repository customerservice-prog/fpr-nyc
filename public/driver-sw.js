const CACHE_NAME = 'fpr-driver-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Network-first with a safe fallback. We intentionally do not pre-cache
// delivery data so drivers always see fresh stop info when online.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})
