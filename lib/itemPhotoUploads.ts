export const ITEM_PHOTO_MAX_BYTES = 5 * 1024 * 1024
export const ITEM_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

export function validateItemPhoto(file: Pick<File, 'type' | 'size'>): string | null {
  if (!ITEM_PHOTO_ACCEPT.split(',').includes(file.type)) {
    return 'Choose a JPG, PNG, WebP, or GIF image.'
  }
  if (file.size === 0) return 'This file is empty. Choose another photo.'
  if (file.size > ITEM_PHOTO_MAX_BYTES) return 'Each photo must be 5 MB or smaller.'
  return null
}

export function itemPhotoUrl(value: string): string | null {
  const url = value.trim()
  if (!url || /[\s\\]/.test(url)) return null
  if (url.startsWith('/') && !url.startsWith('//')) return url
  try {
    const parsed = new URL(url)
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) return null
    return url
  } catch {
    return null
  }
}

// Keep URLs as array entries. Splitting on commas corrupts legacy inline images
// and valid hosted image URLs containing commas.
export function appendItemPhoto(images: string[], url: string): string[] {
  return images.includes(url) ? images : [...images, url]
}

export function moveItemPhoto(images: string[], from: number, to: number): string[] {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= images.length || to >= images.length) return images
  const next = [...images]
  const [photo] = next.splice(from, 1)
  next.splice(to, 0, photo)
  return next
}

export async function uploadItemPhoto(file: File): Promise<string> {
  const validation = validateItemPhoto(file)
  if (validation) throw new Error(validation)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)
  try {
    const body = new FormData()
    body.append('file', file)
    const response = await fetch('/api/admin/upload', {
      method: 'POST', body, signal: controller.signal,
    })
    if (response.status === 401 || response.status === 403) {
      throw new Error('Your upload was not authorized. Sign in again before retrying.')
    }
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(typeof data?.error === 'string' ? data.error : 'Photo upload failed. Please try again.')
    }
    const url = typeof data?.url === 'string' ? itemPhotoUrl(data.url) : null
    if (!url) throw new Error('The upload did not return a valid photo URL. Please try again.')
    return url
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Photo upload timed out. Check your connection and try again.')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
