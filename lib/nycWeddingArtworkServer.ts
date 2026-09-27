import { readFile } from 'node:fs/promises'
import path from 'node:path'

const IDS = new Set(['pkg-basic','pkg-standard','pkg-premium','pkg-luxury','pkg-elite'])

export function isNycWeddingArtworkId(id: string) {
  return IDS.has(id)
}

// Backward-compatible alias for older imports while the NYC fork is finalized.
export const isScWeddingArtworkId = isNycWeddingArtworkId

export function detectWeddingArtworkContentType(bytes: Buffer) {
  if (bytes.length >= 12 && bytes.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) return 'image/png'
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  if (bytes.length >= 6 && (bytes.toString('ascii', 0, 6) === 'GIF87a' || bytes.toString('ascii', 0, 6) === 'GIF89a')) return 'image/gif'
  if (bytes.length >= 12 && bytes.toString('ascii', 4, 12).includes('ftypavif')) return 'image/avif'
  return null
}

export async function readNycWeddingArtwork(id: string) {
  if (!isNycWeddingArtworkId(id)) return null
  try {
    const bytes = await readFile(path.join(process.cwd(), 'public', 'images', 'ny-parity', 'weddings', id + '.bin'))
    const contentType = detectWeddingArtworkContentType(bytes)
    if (!contentType) throw new Error('Unsupported wedding artwork format for ' + id)
    return { bytes, contentType }
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
    if (code === 'ENOENT') return null
    throw error
  }
}
