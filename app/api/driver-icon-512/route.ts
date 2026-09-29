import { NYC_LOGO_PATH } from '@/lib/nycBrand'

// Legacy driver-app icon URL kept for installs that cached the old manifest.
// It sends them to the exact NYC logo. The Location is relative so the redirect
// never depends on the host name seen at build time.
export function GET() {
  return new Response(null, {
    status: 307,
    headers: { Location: NYC_LOGO_PATH, 'Cache-Control': 'public, max-age=300' },
  })
}
