import { renderNycBrandIcon } from '@/lib/nycBrandIcon'

export const runtime = 'nodejs'
export const dynamic = 'force-static'
const sizes = ['16', '32', '48', '96', '180', '192', '256', '512', 'maskable-512']
export function generateStaticParams() { return sizes.map(size => ({ size })) }

export async function GET(_request: Request, context: { params: Promise<{ size: string }> }) {
  const { size } = await context.params
  if (!sizes.includes(size)) return new Response('Not found', { status: 404 })
  const maskable = size === 'maskable-512'
  const bytes = await renderNycBrandIcon(maskable ? 512 : Number(size), maskable)
  return new Response(new Uint8Array(bytes), { headers: {
    'Content-Type': 'image/png',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  } })
}
