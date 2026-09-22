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

const assets = []
for (const [packageId, sourceUrl] of Object.entries(SOURCES)) {
  const response = await fetch(sourceUrl, {
    redirect: 'follow',
    headers: {
      'user-agent': 'FriendlyPartyRental-SC-Parity-Snapshot/1.0',
      'cache-control': 'no-cache',
      accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(20000),
  })
  if (!response.ok) throw new Error(`Unable to snapshot ${packageId}: HTTP ${response.status}`)
  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
  if (!allowed.has(contentType)) throw new Error(`Unexpected content type for ${packageId}: ${contentType || 'missing'}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length < 1024) throw new Error(`Unexpectedly small image for ${packageId}: ${bytes.length} bytes`)
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  await writeFile(path.join(outDir, packageId + '.bin'), bytes)
  assets.push({ packageId, sourceUrl, contentType, bytes: bytes.length, sha256 })
  console.log(`[wedding-art] ${packageId} ${contentType} ${bytes.length} bytes sha256=${sha256}`)
}

await writeFile(
  path.join(outDir, 'manifest.json'),
  JSON.stringify({
    capturedAt: new Date().toISOString(),
    referenceRepo: 'customerservice-prog/friendly-party-rental-app',
    scope: 'Exact public NY wedding-package artwork copied byte-for-byte during the SC build. SC pricing, customers, checkout, accounts and business identity remain separate.',
    assets,
  }, null, 2) + '\n',
)
