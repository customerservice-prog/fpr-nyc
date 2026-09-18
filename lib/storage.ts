import { randomUUID } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'

// Local persistent-volume image storage (for Railway Volumes or any mounted
// disk). Files are written under STORAGE_DIR and served back through the
// /api/uploads/[...path] route. The public interface matches the previous
// S3 helper so the upload + migration routes need no changes.
//
// Required env vars:
//   STORAGE_DIR        absolute path of the mounted volume, e.g. /data/uploads
//   PUBLIC_BASE_URL    site origin used to build absolute URLs for emails,
//                      e.g. https://www.friendlypartyrentalsc.com (no trailing slash)

const { STORAGE_DIR, PUBLIC_BASE_URL } = process.env

export function isStorageConfigured(): boolean {
  return Boolean(STORAGE_DIR && PUBLIC_BASE_URL)
}

function extForType(contentType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  }
  return map[contentType] || 'bin'
}

// Writes a buffer to the Railway-mounted volume and returns an absolute public URL.
// STORAGE_DIR is intentionally a runtime path outside the application source tree.
export async function uploadImage(
  body: Buffer,
  contentType: string,
  _originalName?: string
): Promise<string> {
  if (!isStorageConfigured()) {
    throw new Error('Local storage is not configured')
  }
  const dir = STORAGE_DIR as string
  const base = (PUBLIC_BASE_URL as string).replace(/\/+$/, '')
  const ext = extForType(contentType)
  const filename = randomUUID() + '.' + ext

  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(/*turbopackIgnore: true*/ dir, filename), body)

  return base + '/api/uploads/' + filename
}

// Resolves a stored file's absolute path from a request path segment, guarding
// against path traversal. Used by the file-serving route.
export function resolveStoredFile(segment: string): string | null {
  if (!STORAGE_DIR) return null
  const safe = path.basename(segment)
  if (!safe || safe !== segment) return null
  return path.join(/*turbopackIgnore: true*/ STORAGE_DIR, safe)
}
