import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { prisma } from '@/lib/prisma'
import { SC_WEDDING_IMAGES } from '@/lib/scWeddingImages'
export const dynamic = 'force-dynamic'
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const pkg = await prisma.weddingPackage.findUnique({ where: { id }, select: { image: true, updatedAt: true } })
    if (!pkg) return new NextResponse('Not found', { status: 404 })
    // Match the existing storefront's revision lock; subsequent administrator
    // edits retain priority. Never expose the superseded NY flyer for this row.
    if (pkg.updatedAt.toISOString() === '2026-08-23T19:15:02.017Z' && Object.hasOwn(SC_WEDDING_IMAGES, id)) {
      const bytes = await readFile(path.join(process.cwd(), 'public', SC_WEDDING_IMAGES[id]))
      return new NextResponse(bytes, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=0, must-revalidate', 'X-Image-Reference': 'shared-brand-inspiration', 'X-Content-Type-Options': 'nosniff' } })
    }
    if (!pkg.image) return new NextResponse('Not found', { status: 404 })
    const match = pkg.image.match(/^data:(image\/(?:png|jpeg|webp|gif|avif));base64,(.*)$/s)
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
