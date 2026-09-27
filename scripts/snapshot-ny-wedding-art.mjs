import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const SOURCES = {
  'pkg-basic': 'https://www.friendlypartyrental.com/api/wedding-package-image/pkg-basic',
  'pkg-standard': 'https://www.friendlypartyrental.com/api/wedding-package-image/pkg-standard',
  'pkg-premium': 'https://www.friendlypartyrental.com/api/wedding-package-image/pkg-premium',
  'pkg-luxury': 'https://www.friendlypartyrental.com/api/wedding-package-image/pkg-luxury',
  'pkg-elite': 'https://www.friendlypartyrental.com/api/wedding-package-image/pkg-elite',
}

const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
const outDir = path.join(process.cwd(), 'public', 'images', 'ny-parity', 'weddings')
await mkdir(outDir, { recursive: true })

async function fetchArtwork(packageId, sourceUrl) {
  let lastError = ''
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(sourceUrl, {
        redirect: 'follow',
        headers: {
          'user-agent': 'FriendlyPartyRental-NYC-Parity-Snapshot/1.0',
          'cache-control': 'no-cache',
          accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(20000),
      })
      if (!response.ok) throw new Error('HTTP ' + response.status)
      const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
      if (!allowed.has(contentType)) throw new Error('unexpected content type ' + (contentType || 'missing'))
      const bytes = Buffer.from(await response.arrayBuffer())
      if (bytes.length < 1024) throw new Error('unexpectedly small image: ' + bytes.length + ' bytes')
      return { bytes, contentType }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 1000))
    }
  }
  console.warn('[wedding-art] ' + packageId + ' snapshot skipped after retries: ' + lastError + '; runtime will use the stored package image fallback')
  return null
}

const assets = []
const skipped = []
for (const [packageId, sourceUrl] of Object.entries(SOURCES)) {
  const result = await fetchArtwork(packageId, sourceUrl)
  if (!result) {
    skipped.push({ packageId, sourceUrl })
    continue
  }
  const sha256 = createHash('sha256').update(result.bytes).digest('hex')
  await writeFile(path.join(outDir, packageId + '.bin'), result.bytes)
  assets.push({ packageId, sourceUrl, contentType: result.contentType, bytes: result.bytes.length, sha256 })
  console.log('[wedding-art] ' + packageId + ' ' + result.contentType + ' ' + result.bytes.length + ' bytes sha256=' + sha256)
}

await writeFile(
  path.join(outDir, 'manifest.json'),
  JSON.stringify({
    capturedAt: new Date().toISOString(),
    referenceRepo: 'customerservice-prog/friendly-party-rental-app',
    scope: 'Best-effort copy of public NY wedding-package artwork for NYC visual parity. Missing snapshots fall back to the NYC database package image at runtime.',
    assets,
    skipped,
  }, null, 2) + '\n',
)
