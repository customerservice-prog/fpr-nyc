import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'

const allowedSizes = new Set([16, 32, 48, 96, 180, 192, 256, 512])
const expectedHash = '37bb5f00906e5b71aba2e3d63715b71f1e4b29b5b01e8e40b5f1d27719d1b253'
const cache = new Map<string, Promise<Buffer>>()

/** The original stays unchanged. Only platform-required icons are resized/padded. */
export function renderNycBrandIcon(size: number, maskable = false): Promise<Buffer> {
  if (!allowedSizes.has(size)) return Promise.reject(new Error('Unsupported NYC icon size'))
  const key = `${size}:${maskable}`
  const cached = cache.get(key)
  if (cached) return cached
  const result = (async () => {
    const source = await readFile(path.join(process.cwd(), 'public', 'brand', 'friendly-party-rental-nyc-20260929-original.png'))
    if (createHash('sha256').update(source).digest('hex') !== expectedHash) throw new Error('NYC logo source checksum mismatch')
    const inset = maskable ? Math.ceil(size * 0.15) : 0
    const innerSize = size - inset * 2
    let image = sharp(source).resize(innerSize, innerSize, { fit: 'contain', background: '#ffffff' })
    if (inset) image = image.extend({ top: inset, bottom: inset, left: inset, right: inset, background: '#ffffff' })
    return image.png().toBuffer()
  })()
  cache.set(key, result)
  result.catch(() => cache.delete(key))
  return result
}
