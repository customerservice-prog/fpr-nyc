export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { uploadImage, isStorageConfigured } from '@/lib/storage'

// Accepts a multipart/form-data upload with a single "file" field.
// Streams it to the configured object storage bucket and returns the
// public https URL to store in the DB (e.g. Item.picture).
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: 'Image storage is not configured. Set the STORAGE_* environment variables.' },
      { status: 503 }
    )
  }

  const formData = await request.formData()
  const file = formData.get('file')
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const blob = file as File
  if (!blob.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
  }
  if (blob.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image must be smaller than 5MB' }, { status: 400 })
  }

  try {
    const buffer = Buffer.from(await blob.arrayBuffer())
    const url = await uploadImage(buffer, blob.type, blob.name)
    return NextResponse.json({ url })
  } catch (err) {
    console.error('Upload failed:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
