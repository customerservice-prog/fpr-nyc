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
      { protocol: 'https', hostname: 'www.fpr-nyc-production.up.railway.app' },
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
      "form-action 'self' https://www.fpr-nyc-production.up.railway.app https://fpr-nyc-production.up.railway.app",
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
      ...privatePaths.map(source=>({source,headers:[{key:'X-Robots-Tag',value:'noindex, follow'}]})),
    ]
  },
  async redirects() {
    // Both hosts have existing origin-scoped carts. Do not force a host change
    // without migrating those sessions. Public metadata and the sitemap agree
    // on www as Google's preferred URL; alias redirects stay within the origin.
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'friendly-party-rental-greenville-sc-production.up.railway.app' }],
        destination: 'https://www.fpr-nyc-production.up.railway.app/:path*',
        permanent: true,
      },
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
    ]
  },
}
module.exports = nextConfig
