import { NextRequest, NextResponse } from 'next/server'
import { readScWeddingArtwork } from '@/lib/nycWeddingArtworkServer'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const artwork = await readScWeddingArtwork(id)
    if (!artwork) return new NextResponse('Not found', { status: 404 })
    return new NextResponse(artwork.bytes, {
      headers: {
        'Content-Type': artwork.contentType,
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
        'X-Content-Type-Options': 'nosniff',
        'X-Image-Reference': 'exact-public-NY-artwork-local-SC-snapshot',
      },
    })
  } catch {
    return new NextResponse('Image unavailable', { status: 503 })
  }
}
