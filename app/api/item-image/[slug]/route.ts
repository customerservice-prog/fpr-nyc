import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const item = await prisma.item.findUnique({
    where: { slug: (await params).slug },
    select: { picture: true },
  })

  if (!item?.picture) {
    return new NextResponse('Not found', { status: 404 })
  }

  const match = item.picture.match(/^data:([^;]+);base64,(.+)$/)
  if (match) {
    const buffer = Buffer.from(match[2], 'base64')
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': match[1],
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    })
  }

  const upstream = await fetch(item.picture); if (!upstream.ok) return new NextResponse('Not found', { status: 404 }); return new NextResponse(Buffer.from(await upstream.arrayBuffer()), { headers: { 'Content-Type': upstream.headers.get('content-type') || 'image/jpeg', 'Cache-Control': 'public, max-age=0, must-revalidate' } })
}

