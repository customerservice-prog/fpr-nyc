/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The @zoom/meetingsdk embedded UMD bundle require()s '@zoom/download-manager',
  // an unpublished Zoom-internal module (404 on npm) that is only reached by the
  // full Client View download path, never by the embedded Component View we use.
  // Turbopack's resolveAlias can't map to false, so point it at an empty stub
  // module instead of failing the build with "Module not found".
  turbopack: {
    resolveAlias: {
      '@zoom/download-manager': './lib/stubs/zoom-download-manager.ts',
    },
  },
  images: {
    domains: [
      'www.friendlypartyrentalsc.com',
      'friendlypartyrentalsc.com',
      'images.unsplash.com',
      'files.sysers.com',
      '315.ourers.com',
    ],
    localPatterns: [
      { pathname: '/**' },      ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  async redirects() {
    return [
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
