import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function escapeXml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&apos;',
    '"': '&quot;',
  }[char] || char))
}

function fallbackImage(name: string, reason: string) {
  const safeName = escapeXml(name || 'Rental item')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-label="${safeName}"><rect width="1200" height="900" fill="#f4f4f5"/><rect x="80" y="80" width="1040" height="740" rx="32" fill="#fff" stroke="#d4d4d8" stroke-width="4"/><text x="600" y="410" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="54" font-weight="700" fill="#18181b">${safeName}</text><text x="600" y="485" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="34" fill="#71717a">Photo coming soon</text></svg>`

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      'X-Content-Type-Options': 'nosniff',
      'X-Image-Fallback': reason,
    },
  })
}

function isAllowedImageUrl(raw: string) {
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const item = await prisma.item.findUnique({
    where: { slug },
    select: { name: true, picture: true },
  })

  if (!item) {
    return new NextResponse('Not found', { status: 404 })
  }

  if (!item.picture) {
    return fallbackImage(item.name, 'missing')
  }

  const match = item.picture.match(/^data:([^;]+);base64,(.+)$/)
  if (match) {
    try {
      const buffer = Buffer.from(match[2], 'base64')
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': match[1],
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
          'X-Content-Type-Options': 'nosniff',
        },
      })
    } catch {
      return fallbackImage(item.name, 'invalid-inline-image')
    }
  }

  if (!isAllowedImageUrl(item.picture)) {
    return fallbackImage(item.name, 'invalid-url')
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    try {
      const upstream = await fetch(item.picture, {
        signal: controller.signal,
        redirect: 'follow',
        cache: 'no-store',
      })

      if (!upstream.ok) {
        return fallbackImage(item.name, `upstream-${upstream.status}`)
      }

      const contentType = upstream.headers.get('content-type') || ''
      if (!contentType.toLowerCase().startsWith('image/')) {
        return fallbackImage(item.name, 'invalid-content-type')
      }

      return new NextResponse(Buffer.from(await upstream.arrayBuffer()), {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
          'X-Content-Type-Options': 'nosniff',
        },
      })
    } finally {
      clearTimeout(timeout)
    }
  } catch {
    return fallbackImage(item.name, 'fetch-failed')
  }
}
