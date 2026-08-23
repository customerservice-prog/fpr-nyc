export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import { resolveStoredFile } from '@/lib/storage'

// Serves image files stored on the persistent volume. Public (no auth) because
// these URLs are embedded in customer emails and loaded by mail clients.
const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const segments = (await params).path || []
  // Only a single flat filename is expected (uploadImage stores files flat).
  if (segments.length !== 1) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const filePath = resolveStoredFile(segments[0])
  if (!filePath) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const data = await fs.readFile(filePath)
    const ext = (segments[0].split('.').pop() || '').toLowerCase()
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream'
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
                'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
