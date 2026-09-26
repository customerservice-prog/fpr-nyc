import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readScWeddingArtwork } from '@/lib/scWeddingArtworkServer'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const pkg = await prisma.weddingPackage.findUnique({ where: { id }, select: { image: true } })
    if (!pkg) return new NextResponse('Not found', { status: 404 })

    const exactArtwork = await readScWeddingArtwork(id)
    if (exactArtwork) {
      return new NextResponse(exactArtwork.bytes, {
        headers: {
          'Content-Type': exactArtwork.contentType,
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
          'X-Image-Reference': 'exact-public-NY-artwork-local-SC-snapshot',
          'X-Content-Type-Options': 'nosniff',
        },
      })
    }

    if (!pkg.image) return new NextResponse('Not found', { status: 404 })
    const match = pkg.image.match(/^data:(image\/(?:png|jpeg|webp|gif|avif));base64,([\s\S]*)$/)
    if (match) return new NextResponse(Buffer.from(match[2], 'base64'), { headers: { 'Content-Type': match[1], 'Cache-Control': 'public, max-age=0, must-revalidate', 'X-Content-Type-Options': 'nosniff' } })

    const upstream = await fetch(pkg.image, { signal: AbortSignal.timeout(10000) })
    if (!upstream.ok) return new NextResponse('Image unavailable', { status: 404 })
    const contentType = upstream.headers.get('content-type') || ''
    if (!contentType.startsWith('image/')) return new NextResponse('Invalid image response', { status: 502 })
    return new NextResponse(Buffer.from(await upstream.arrayBuffer()), { headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=0, must-revalidate', 'X-Content-Type-Options': 'nosniff' } })
  } catch {
    return new NextResponse('Image temporarily unavailable', { status: 503 })
  }
}
