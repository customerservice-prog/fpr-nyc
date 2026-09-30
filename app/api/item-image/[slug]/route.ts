import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Serves NYC item photos from this NYC domain.
//   /api/item-image/<slug>            main photo (Item.picture)
//   /api/item-image/<slug>?index=N    additional photo N (Item.additionalImages[N])
// The catalog sync stores the Syracuse photo URLs for every mirrored item, so NYC
// shows exactly the Syracuse photo through this local proxy (no hotlinking from
// customer browsers). Inline (data:) images and uploads stored by NYC admin work too.

const CACHE_CONTROL = 'public, max-age=3600, stale-while-revalidate=86400'
const MAX_ADDITIONAL_INDEX = 50

function escapeXml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&apos;',
    '"': '&quot;',
  }[char] || char))
}

// Last resort only: every published NYC item has a real photo (the catalog sync does
// not publish an item until Syracuse has a photo for it).
async function fallbackImage(name: string, reason: string) {
  const safeName = escapeXml(name || 'Rental item')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-label="${safeName}"><rect width="1200" height="900" fill="#f4f4f5"/><rect x="80" y="80" width="1040" height="740" rx="32" fill="#fff" stroke="#d4d4d8" stroke-width="4"/><text x="600" y="410" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="54" font-weight="700" fill="#18181b">${safeName}</text><text x="600" y="485" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="34" fill="#71717a">Photo coming soon</text></svg>`

  return new NextResponse(await sharp(Buffer.from(svg)).png().toBuffer(), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
      'X-Image-Fallback': reason,
    },
  })
}

function sourceUrl(raw: string, requestUrl: string): URL | null {
  try {
    const url = raw.startsWith('/') ? new URL(raw, requestUrl) : new URL(raw)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null
  } catch {
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const indexParam = request.nextUrl.searchParams.get('index')
  const index = indexParam === null ? null : Number(indexParam)
  if (index !== null && (!Number.isInteger(index) || index < 0 || index > MAX_ADDITIONAL_INDEX)) {
    return new NextResponse('Not found', { status: 404 })
  }

  let name = 'Rental item'
  let source: string | null | undefined = null
  if (index === null) {
    const item = await prisma.item.findUnique({ where: { slug }, select: { name: true, picture: true } })
    if (!item) return new NextResponse('Not found', { status: 404 })
    name = item.name
    source = item.picture
  } else {
    const item = await prisma.item.findUnique({ where: { slug }, select: { name: true, additionalImages: true } })
    if (!item) return new NextResponse('Not found', { status: 404 })
    name = item.name
    source = Array.isArray(item.additionalImages) ? item.additionalImages[index] : null
  }
  if (!source) {
    return index === null ? fallbackImage(name, 'missing') : new NextResponse('Not found', { status: 404 })
  }

  const inline = source.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i)
  if (inline) {
    try {
      return new NextResponse(Buffer.from(inline[2], 'base64'), {
        headers: { 'Content-Type': inline[1], 'Cache-Control': CACHE_CONTROL, 'X-Content-Type-Options': 'nosniff' },
      })
    } catch {
      return fallbackImage(name, 'invalid-inline-image')
    }
  }

  const upstreamUrl = sourceUrl(source, request.url)
  if (!upstreamUrl) {
    return fallbackImage(name, 'invalid-url')
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
      cache: 'no-store',
      headers: { Accept: 'image/*' },
    })
    if (!upstream.ok) {
      return fallbackImage(name, `upstream-${upstream.status}`)
    }
    const contentType = upstream.headers.get('content-type') || ''
    if (!contentType.toLowerCase().startsWith('image/')) {
      return fallbackImage(name, 'invalid-content-type')
    }
    return new NextResponse(Buffer.from(await upstream.arrayBuffer()), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': CACHE_CONTROL,
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return fallbackImage(name, 'fetch-failed')
  }
}
