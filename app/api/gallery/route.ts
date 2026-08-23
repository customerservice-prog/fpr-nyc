export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const images = await prisma.galleryImage.findMany({
    orderBy: { sortOrder: 'asc' },
  })
  return NextResponse.json({ images })
}

// Accepts either:
//  - multipart/form-data with a "file" field (image bytes are inlined as a
//    base64 data: URI, since object storage may not be configured), or
//  - application/json with a "url" string (already-hosted image URL).
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const contentType = request.headers.get('content-type') || ''
  let url: string | undefined
  let caption: string | null = null
  let sortOrder = 0

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const file = formData.get('file')
    const captionField = formData.get('caption')
    const sortOrderField = formData.get('sortOrder')

    if (file && typeof file !== 'string') {
      const blob = file as File
      if (!blob.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
      }
      const buffer = Buffer.from(await blob.arrayBuffer())
      url = `data:${blob.type};base64,${buffer.toString('base64')}`
    }
    if (typeof captionField === 'string' && captionField.length > 0) {
      caption = captionField
    }
    if (typeof sortOrderField === 'string') {
      const parsed = parseInt(sortOrderField, 10)
      if (!Number.isNaN(parsed)) sortOrder = parsed
    }
  } else {
    const body = await request.json()
    if (typeof body.url === 'string') url = body.url
    if (typeof body.caption === 'string') caption = body.caption
    if (typeof body.sortOrder === 'number') sortOrder = body.sortOrder
  }

  if (!url) {
    return NextResponse.json({ error: 'A file or url is required' }, { status: 400 })
  }

  const image = await prisma.galleryImage.create({
    data: { url, caption, sortOrder },
  })

  return NextResponse.json({ image })
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id query param is required' }, { status: 400 })
  }

  await prisma.galleryImage.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
