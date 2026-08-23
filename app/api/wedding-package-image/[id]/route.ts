import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const pkg = await prisma.weddingPackage.findUnique({
          where: { id: (await params).id },
          select: { image: true },
    })

  if (!pkg?.image) {
        return new NextResponse('Not found', { status: 404 })
  }

  const match = pkg.image.match(/^data:(.+?);base64,(.*)$/)
    if (match) {
          const buffer = Buffer.from(match[2], 'base64')
          return new NextResponse(buffer, {
                  headers: {
                            'Content-Type': match[1],
                            'Cache-Control': 'public, max-age=0, must-revalidate',
                  },
          })
    }

  const upstream = await fetch(pkg.image); if (!upstream.ok) return new NextResponse('Not found', { status: 404 }); return new NextResponse(Buffer.from(await upstream.arrayBuffer()), { headers: { 'Content-Type': upstream.headers.get('content-type') || 'image/jpeg', 'Cache-Control': 'public, max-age=0, must-revalidate' } })
}
