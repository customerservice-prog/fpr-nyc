import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { prisma } from '@/lib/prisma'
import { NYC_LOGO_PATH } from '@/lib/nycBrand'
import { weddingPackageCatalogDetails } from '@/lib/weddingPackageCatalog'

const PACKAGES: Record<string, { slug: string; number: number; title: [string, string] }> = {
  'pkg-basic': { slug: 'wedding-package-backyard-elopement', number: 1, title: ['Backyard', 'Elopement'] },
  'pkg-standard': { slug: 'wedding-package-classic-ceremony', number: 2, title: ['Classic', 'Ceremony'] },
  'pkg-premium': { slug: 'wedding-package-garden-reception', number: 3, title: ['Garden', 'Reception'] },
  'pkg-luxury': { slug: 'wedding-package-luxury-estate', number: 4, title: ['Luxury', 'Estate'] },
  'pkg-elite': { slug: 'wedding-package-all-inclusive-premium', number: 5, title: ['All-Inclusive', 'Premium'] },
}

type CatalogArtworkItem = { name: string; cost: number; description: string | null }

/** Coordinates are in the original Minoa brochure's viewBox, scaled to the edited PNG. */
export const MINOA_WEDDING_ARTWORK: Record<string, {
  approvedPrice: number; width: number; height: number; guests: number;
  inclusions: RegExp[];
  price: { x: number; y: number; width: number; height: number; fontSize: number; background: string; color: string; cents?: boolean };
}> = {
  'pkg-basic': {
    approvedPrice: 595, width: 800, height: 839, guests: 30,
    inclusions: [/\b10\s*x\s*20\b.*\bez pop-up tent\b/, /^(?:up to )?4 folding tables\b/, /^(?:up to )?30 white folding chairs\b/, /^white table linens\b/, /setup\s*(?:&|and)\s*breakdown/],
    price: { x: 50, y: 292, width: 237, height: 66, fontSize: 61, background: '#002957', color: '#ffffff', cents: true },
  },
  'pkg-standard': {
    approvedPrice: 995, width: 800, height: 640, guests: 50,
    inclusions: [/\b20\s*x\s*20\b.*\bpole tent\b/, /^6 6 folding tables\b/, /^50 white folding chairs\b/, /^white table linens\b/, /^basic centerpiece accents\b/, /setup\s*(?:&|and)\s*breakdown/],
    price: { x: 27, y: 227, width: 201, height: 51, fontSize: 46, background: '#f5f4ef', color: '#0d273b', cents: true },
  },
  'pkg-premium': {
    approvedPrice: 3295, width: 1536, height: 1024, guests: 80,
    inclusions: [/\b20\s*x\s*40\b.*\bpole tent\b/, /^8 5 round banquet tables\b/, /^80 gold chiavari chairs\b/, /^8 premium table linens\b/, /^8 rustic lantern table centerpieces\b/, /^perimeter string lighting\b/, /setup\s*(?:&|and)\s*breakdown/],
    price: { x: 46, y: 366, width: 307, height: 98, fontSize: 91, background: '#f5f4ef', color: '#061b11' },
  },
  'pkg-luxury': {
    approvedPrice: 7495, width: 1536, height: 1024, guests: 150,
    inclusions: [/\b40\s*x\s*60\b.*\bpole tent\b/, /^15 five-foot round banquet tables\b/, /^150 gold chiavari chairs\b/, /^15 premium table linens\b/, /^15 rustic lantern table centerpieces\b/, /^4 cocktail tables with spandex covers\b/, /^perimeter string lighting\b/, /setup\s*(?:&|and)\s*breakdown/],
    price: { x: 46, y: 366, width: 307, height: 98, fontSize: 91, background: '#f5f4ef', color: '#061b11' },
  },
  'pkg-elite': {
    approvedPrice: 12995, width: 1536, height: 1024, guests: 200,
    inclusions: [/\b40\s*x\s*100\b.*\bpole tent\b/, /^20 five-foot round banquet tables\b/, /^200 gold chiavari chairs\b/, /^20 premium table linens\b/, /^20 rustic lantern table centerpieces\b/, /^6 cocktail tables with spandex covers\b/, /\b18\s*x\s*18\b.*\bportable dance floor\b/, /^perimeter string lighting\b/, /^1 6-hour photo booth rental\b/, /setup\s*(?:&|and)\s*breakdown/],
    price: { x: 35, y: 349, width: 324, height: 97, fontSize: 89, background: '#f5f4ef', color: '#061b11' },
  },
}

function inclusionText(value: string) {
  const numbers: Record<string, string> = { one: '1', four: '4', six: '6', eight: '8', fifteen: '15', twenty: '20', eighty: '80' }
  return value.toLowerCase().replace(/[′’']/g, '').replace(/×/g, 'x')
    .replace(/\b(?:one|four|six|eight|fifteen|twenty|eighty)\b/g, word => numbers[word])
    .replace(/\s+/g, ' ').trim()
}

/** A styled picture may be reused only while its advertised scope matches checkout. */
export function minoaArtworkMatchesCatalog(id: string, item: CatalogArtworkItem) {
  if (!isNycWeddingArtworkId(id)) return false
  const approved = MINOA_WEDDING_ARTWORK[id]
  const name = item.name.replace(/^Wedding Package\s*-\s*/i, '').toLowerCase()
  if (name !== PACKAGES[id].title.join(' ').toLowerCase()) return false
  const details = weddingPackageCatalogDetails(item.description)
  if (details.guests !== approved.guests || details.items.length !== approved.inclusions.length) return false
  const included = details.items.map(inclusionText)
  return approved.inclusions.every(pattern => included.some(line => pattern.test(line)))
}

/** Never read the unedited upstream brochures: their prices and locality are obsolete. */
export async function renderMinoaStyleWeddingArtwork(id: string, item: CatalogArtworkItem) {
  const cost = Number(item.cost)
  if (!Number.isFinite(cost) || cost <= 0 || !minoaArtworkMatchesCatalog(id, item)) return null
  const approved = MINOA_WEDDING_ARTWORK[id]
  try {
    const bytes = await readFile(path.join(process.cwd(), 'public', 'images', 'nyc-wedding-minoa-style', id + '.png'))
    if (detectWeddingArtworkContentType(bytes) !== 'image/png') return null
    const metadata = await sharp(bytes).metadata()
    if (metadata.format !== 'png' || !metadata.width || !metadata.height) return null
    // Preserve the owner's approved raster edit exactly at its approved price.
    if (cost === approved.approvedPrice) return { bytes, contentType: 'image/png', reference: 'NYC-Minoa-style-current-catalog' }

    // A later price edit must not revive the amount baked into the approved art.
    // This code-native SVG replaces only the calibrated price region.
    const region = approved.price
    const cents = region.cents || !Number.isInteger(cost)
    const price = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 }).format(cost)
    const fontSize = Math.min(region.fontSize, (region.width - 10) / (price.length * 0.65))
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${metadata.width}" height="${metadata.height}" viewBox="0 0 ${approved.width} ${approved.height}" preserveAspectRatio="none"><rect x="${region.x}" y="${region.y}" width="${region.width}" height="${region.height}" fill="${region.background}"/><text x="${region.x + region.width / 2}" y="${region.y + region.height / 2 + fontSize * 0.34}" text-anchor="middle" font-family="DejaVu Serif,serif" font-size="${fontSize}" font-weight="700" fill="${region.color}">${xml(price)}</text></svg>`
    return { bytes: await sharp(bytes).composite([{ input: Buffer.from(svg), left: 0, top: 0 }]).png().toBuffer(), contentType: 'image/png', reference: 'NYC-Minoa-style-current-catalog' }
  } catch {
    return null
  }
}

export function isNycWeddingArtworkId(id: string) { return Object.prototype.hasOwnProperty.call(PACKAGES, id) }
export const isScWeddingArtworkId = isNycWeddingArtworkId

export function detectWeddingArtworkContentType(bytes: Buffer) {
  if (bytes.length >= 12 && bytes.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) return 'image/png'
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  if (bytes.length >= 6 && (bytes.toString('ascii', 0, 6) === 'GIF87a' || bytes.toString('ascii', 0, 6) === 'GIF89a')) return 'image/gif'
  if (bytes.length >= 12 && bytes.toString('ascii', 4, 12).includes('ftypavif')) return 'image/avif'
  return null
}

function xml(value: string) {
  return value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;' }[character]!))
}

function wrap(value: string, length = 33): string[] {
  const words = value.replace(/\s+/g, ' ').trim().split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    if (line && (line + ' ' + word).length > length) { lines.push(line); line = word }
    else line += (line ? ' ' : '') + word
  }
  if (line) lines.push(line)
  return lines
}

/** A new code-native card: original price-free catalog photography plus live NYC text. */
export async function renderNycWeddingArtwork(id: string, item: CatalogArtworkItem) {
  if (!isNycWeddingArtworkId(id)) return null
  const info = PACKAGES[id]
  const [photo, logo] = await Promise.all([
    readFile(path.join(process.cwd(), 'public', 'images', 'nyc-wedding-equipment', id + '.jpg')),
    readFile(path.join(process.cwd(), 'public', NYC_LOGO_PATH)),
  ])
  const details = weddingPackageCatalogDetails(item.description)
  const cost = Number(item.cost)
  const priced = Number.isFinite(cost) && cost > 0
  const price = priced ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(cost) ? 0 : 2, maximumFractionDigits: 2 }).format(cost) : 'Price on request'
  const priceFont = priced ? Math.min(79, 410 / (price.length * 0.7)) : 36
  let cursor = 440
  const rows: string[] = []
  // The public catalog remains the authority. Never repeat the old brochure's scope.
  for (const inclusion of details.items) {
    const lines = wrap(inclusion)
    const height = lines.length * 26 + 12
    if (cursor + height > 772) break
    rows.push(`<circle cx="46" cy="${cursor - 7}" r="12" fill="#1e4938"/><path d="M40 ${cursor - 7}l4 4 8-9" fill="none" stroke="#fff" stroke-width="2.5"/>`)
    rows.push(`<text x="68" y="${cursor}" font-family="DejaVu Sans,sans-serif" font-size="21" fill="#243d32">${lines.map((line, index) => `<tspan x="68" dy="${index ? 26 : 0}">${xml(line)}</tspan>`).join('')}</text>`)
    cursor += height
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-label="${xml(item.name)} — ${xml(price)}">
    <defs><clipPath id="photo"><rect x="486" y="122" width="686" height="502" rx="24"/></clipPath></defs>
    <rect width="1200" height="900" fill="#f8f5ed"/><rect width="1200" height="91" fill="#183d2d"/>
    <text x="36" y="39" font-family="DejaVu Sans,sans-serif" font-size="16" font-weight="700" letter-spacing="3" fill="#edc677">WEDDING PACKAGE ${info.number}</text>
    <text x="36" y="68" font-family="DejaVu Sans,sans-serif" font-size="21" fill="#fff">Friendly Party Rental NYC · Riverdale</text>
    <path d="M464 120v665" stroke="#d8c693" stroke-width="2"/>
    <text x="34" y="172" font-family="DejaVu Serif,serif" font-size="${id === 'pkg-elite' ? 44 : 57}" font-weight="700" fill="#173d2c">${xml(info.title[0])}</text>
    <text x="34" y="233" font-family="DejaVu Serif,serif" font-size="57" font-style="italic" fill="#173d2c">${xml(info.title[1])}</text>
    <text x="34" y="338" font-family="DejaVu Serif,serif" font-size="${priceFont}" font-weight="700" fill="#173d2c">${xml(price)}</text>
    <text x="37" y="377" font-family="DejaVu Sans,sans-serif" font-size="23" fill="#536153">${details.guests > 0 ? `UP TO ${details.guests} GUESTS` : 'SEE PACKAGE DETAILS'}</text>
    <path d="M36 404h394" stroke="#c6aa66" stroke-width="2"/>
    ${rows.join('')}
    <rect x="486" y="122" width="686" height="502" rx="24" fill="#fff"/>
    <image x="496" y="132" width="666" height="482" preserveAspectRatio="xMidYMid meet" clip-path="url(#photo)" xlink:href="data:image/jpeg;base64,${photo.toString('base64')}"/>
    <text x="829" y="650" text-anchor="middle" font-family="DejaVu Sans,sans-serif" font-size="18" fill="#5b665d">Actual rental-equipment photo · Setup varies by venue</text>
    <image x="509" y="670" width="225" height="113" preserveAspectRatio="xMidYMid meet" xlink:href="data:image/png;base64,${logo.toString('base64')}"/>
    <text x="763" y="708" font-family="DejaVu Serif,serif" font-size="31" font-weight="700" fill="#173d2c">Riverdale, Bronx, NY</text>
    <text x="763" y="746" font-family="DejaVu Sans,sans-serif" font-size="24" fill="#6b5733">718-283-4593</text>
    <rect y="815" width="1200" height="85" fill="#183d2d"/>
    <text x="600" y="850" text-anchor="middle" font-family="DejaVu Sans,sans-serif" font-size="22" fill="#fff">Travel fee &amp; applicable sales tax additional.</text>
    <text x="600" y="879" text-anchor="middle" font-family="DejaVu Sans,sans-serif" font-size="18" fill="#dfdccb">Review package details for the complete inclusions and exclusions.</text>
  </svg>`
  return { bytes: await sharp(Buffer.from(svg)).png().toBuffer(), contentType: 'image/png', reference: 'native-NYC-package-current-catalog' }
}

export async function readNycWeddingArtwork(id: string) {
  if (!isNycWeddingArtworkId(id)) return null
  const item = await prisma.item.findFirst({
    where: { slug: PACKAGES[id].slug, displayToCustomer: true, category: { displayToCustomer: true } },
    select: { name: true, cost: true, description: true },
  })
  if (!item) return null
  return await renderMinoaStyleWeddingArtwork(id, item) || renderNycWeddingArtwork(id, item)
}
