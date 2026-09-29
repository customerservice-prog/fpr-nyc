import { renderNycBrandIcon } from '@/lib/nycBrandIcon'
export const runtime = 'nodejs'
export const dynamic = 'force-static'
export async function GET() {
  const bytes = await renderNycBrandIcon(512, true)
  return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } })
}
