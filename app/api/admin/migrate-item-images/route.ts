export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadImage, isStorageConfigured } from '@/lib/storage'

// One-time (idempotent) migration: finds every Item whose picture is stored as
// an inline base64 data: URI, re-uploads the bytes to object storage, and
// replaces the picture value with the resulting hosted https URL.
//
// Safe to run repeatedly: items that already have an http(s) URL are skipped,
// so re-running only picks up whatever is still on a data: URI.
//
// Trigger deliberately, e.g.:  POST /api/admin/migrate-item-images
// Requires an authenticated admin session and configured storage env vars.
export async function POST(_request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: 'Image storage is not configured. Set the STORAGE_* environment variables first.' },
      { status: 503 }
    )
  }

  const items = await prisma.item.findMany({
    where: { picture: { startsWith: 'data:' } },
    select: { id: true, picture: true },
  })

  let migrated = 0
  let failed = 0
  const errors: { id: string; error: string }[] = []

  for (const item of items) {
    const picture = item.picture || ''
    const match = picture.match(/^data:([^;]+);base64,([\s\S]*)$/)
    if (!match) {
      failed++
      errors.push({ id: item.id, error: 'unrecognized data URI format' })
      continue
    }
    try {
      const contentType = match[1]
      const buffer = Buffer.from(match[2], 'base64')
      const url = await uploadImage(buffer, contentType)
      await prisma.item.update({ where: { id: item.id }, data: { picture: url } })
      migrated++
    } catch (err) {
      failed++
      errors.push({ id: item.id, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return NextResponse.json({
    total: items.length,
    migrated,
    failed,
    errors: errors.slice(0, 20),
  })
}
