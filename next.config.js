// Exact NYC logo (single source of truth: lib/nycBrand.ts). Retired NYC logo and icon
// files were removed from public/; their old URLs redirect here so cached pages,
// already-sent emails, bookmarks and browsers never show an old logo.
const NYC_LOGO_PATH = '/brand/friendly-party-rental-nyc-logo-v8.png'
const RETIRED_NYC_LOGO_PATHS = [
  '/brand/friendly-party-rental-nyc-logo-v2.png',
  '/brand/friendly-party-rental-nyc-logo-v5.png',
  '/brand/friendly-party-rental-nyc-logo-v6.png',
  '/brand/friendly-party-rental-nyc-logo-v7.png',
  '/images/fpr-nyc-logo-v7.png',
  '/images/logo.png',
  '/images/logo-icon.png',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/favicon-48x48.png',
  '/favicon-96x96.png',
  '/apple-touch-icon.png',
  '/apple-touch-icon-precomposed.png',
  '/sc-icon-192.png',
  '/sc-icon-512.png',
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    resolveAlias: {
      '@zoom/download-manager': './lib/stubs/zoom-download-manager.ts',
    },
  },
  images: {
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 480, 576],
    remotePatterns: [
      { protocol: 'https', hostname: 'friendlypartyrentalnyc.com' },
      { protocol: 'https', hostname: 'fpr-nyc-production.up.railway.app' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'files.sysers.com' },
      { protocol: 'https', hostname: '315.ourers.com' },
    ],
    localPatterns: [{ pathname: '/**' }],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  async headers() {
    const contentSecurityPolicy = [
      "default-src 'self' https: data: blob:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
      "style-src 'self' 'unsafe-inline' https:",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https:",
      "connect-src 'self' https: wss:",
      "frame-src 'self' https:",
      "media-src 'self' blob: https:",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://friendlypartyrentalnyc.com https://fpr-nyc-production.up.railway.app",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests",
    ].join('; ')
    const globalHeaders = [
      { key: 'Content-Security-Policy', value: contentSecurityPolicy },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
    ]
    const privatePaths=['/admin/:path*','/driver/:path*','/checkout/:path*','/pay/:path*','/pay-now','/contract/:path*','/schedule/:path*','/unsubscribe','/items']
    return [
      { source: '/:path*', headers: globalHeaders },
      // The Railway service address stays usable for staff but is never indexed;
      // canonical URLs always point at https://friendlypartyrentalnyc.com.
      { source: '/:path*', has: [{ type: 'host', value: 'fpr-nyc-production.up.railway.app' }], headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      ...privatePaths.map(source=>({source,headers:[{key:'X-Robots-Tag',value:'noindex, follow'}]})),
    ]
  },
  async rewrites() {
    return [
      {
        source: '/:file(google[A-Za-z0-9_-]+\\.html)',
        destination: '/api/google-site-verification?file=:file',
      },
    ]
  },
  async redirects() {
    // Keep temporary-host redirects internal to this NYC service. Custom-domain
    // canonicalization will be added only when the final NYC domain is connected.
    return [
      ...RETIRED_NYC_LOGO_PATHS.map((source) => ({ source, destination: NYC_LOGO_PATH, permanent: false })),
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/home', destination: '/', permanent: true },
      { source: '/view_gallery', destination: '/gallery', permanent: true },
      { source: '/items/weddings', destination: '/weddings', permanent: true },
      { source: '/categories/chairs', destination: '/category/table-chair-rentals', permanent: true },
      { source: '/category/yard_games', destination: '/category/yard-game-rentals', permanent: true },
      { source: '/category/concessions', destination: '/category/concession-machine-rentals', permanent: true },
      { source: '/category/linens', destination: '/category/linen-rentals', permanent: true },
      { source: '/category/tents', destination: '/category/tent-rentals', permanent: true },
      { source: '/category/bounce_houses-waterslides', destination: '/category/bounce-house-rentals', permanent: true },
      { source: '/category/dance-floor-ad-ons', destination: '/category/dance-floor-stage-rentals', permanent: true },
      { source: '/category/heating-cooling', destination: '/category/heater-fan-rentals', permanent: true },
      { source: '/category/lighting', destination: '/category/event-lighting-rentals', permanent: true },
      { source: '/category/package_deals', destination: '/category/party-rental-packages', permanent: true },
      { source: '/category/inflatable_movie_screen', destination: '/category/inflatable-movie-screen-rentals', permanent: true },
      { source: '/category/beverage_and_food_service', destination: '/category/beverage-food-service', permanent: true },
      { source: '/category/tables_-_folding_chairs-_throne_chairs', destination: '/category/table-chair-rentals', permanent: true },
      { source: '/category/foam_machine', destination: '/category/foam-party-machine-rentals', permanent: true },
      { source: '/category/photobooth', destination: '/category/photobooth-rentals', permanent: true },
      { source: '/category/generator', destination: '/category/generator-rentals', permanent: true },
      { source: '/category/folding_chairs-_throne_chairs', destination: '/category/table-chair-rentals', permanent: true },
      { source: '/items/bounce_house__plus__waterslide_combo_package', destination: '/items/bounce-house-water-slide-combo-package', permanent: true },
      { source: '/items/flower_wall', destination: '/items/greenery-and-floral-wall-8x8', permanent: true },
      // NYC primary domain: https://friendlypartyrentalnyc.com. Only the www host is
      // redirected (Next.js keeps the path and query string); the temporary Railway
      // address is never redirected, so its carts and staff sessions keep working.
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.friendlypartyrentalnyc.com' }],
        destination: 'https://friendlypartyrentalnyc.com/:path*',
        permanent: true,
      },
    ]
  },
}
module.exports = nextConfig
