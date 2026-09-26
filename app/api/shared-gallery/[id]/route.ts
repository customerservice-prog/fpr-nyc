import { NextResponse } from 'next/server'
import path from 'node:path'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

// These two public brand photos lost their EXIF orientation in the original
// export. Correct the presentation without modifying SC gallery database rows.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (id !== '2' && id !== '4') return new NextResponse('Not found', { status: 404 })
  try {
    const file = path.join(process.cwd(), 'public', 'images', 'shared-gallery', `brand-${id}.jpg`)
    const image = await sharp(file).rotate(90).jpeg({ quality: 88 }).toBuffer()
    return new NextResponse(image, { headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'X-Content-Type-Options': 'nosniff',
    } })
  } catch {
    return new NextResponse('Image unavailable', { status: 503 })
  }
}
