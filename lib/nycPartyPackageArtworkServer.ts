import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { nycItemUrlSlug } from '@/lib/nycItemPath'

type CatalogArtworkItem = { name: string; cost: number; description: string | null }
type PriceRegion = { x: number; y: number; width: number; height: number; fontSize: number; background: string; color: string; maskPath?: string; preserveCurrency?: boolean }
type PartyArtwork = {
  name: string; approvedPrice: number; width: number; height: number; inclusions: RegExp[]; exclusions?: RegExp[]; price: PriceRegion
}

const tent = (width: number, length: number) => new RegExp(`\\b${width}\\s*x\\s*${length}\\b[^.]*\\btent\\b`)
const tables = (count: number) => new RegExp(`\\b${count}\\s+(?:6\\s+foot\\s+)?(?:plastic\\s+)?(?:folding\\s+)?tables\\b`)
const chairs = (count: number) => new RegExp(`\\b${count}\\s+(?:white\\s+)?(?:plastic\\s+)?(?:folding\\s+)?chairs\\b`)
const bounce = /\b1\s+rainbow castle bounce house\b/
const slide = /\b1\s+tidal wave inflatable water slide\b/

/** Numeric-only price coordinates use the reviewed PNG's viewBox and scale with later resized copies. */
export const MINOA_PARTY_ARTWORK: Record<string, PartyArtwork> = {
  '20x20-tent-package-4-tables-32-chairs': {
    name: '20x20 Tent Package – 4 Tables & 32 Chairs', approvedPrice: 645, width: 1536, height: 1024,
    inclusions: [tent(20, 20), tables(4), chairs(32)],
    price: { x: 83, y: 691, width: 304, height: 145, fontSize: 181, background: '#000800', color: '#83e600' },
  },
  '20x30-tent-8-tables-64-chairs-package': {
    name: '20x30 Tent + 8 Tables + 64 Chairs Package', approvedPrice: 1045, width: 1448, height: 1086,
    inclusions: [tent(20, 30), tables(8), chairs(64)],
    price: { x: 184, y: 619, width: 357, height: 166, fontSize: 200, background: '#000000', color: '#58e000' },
  },
  '30x30-tent-package-8-tables-80-chairs': {
    name: '30x30 Tent Package – 8 Tables & 80 Chairs', approvedPrice: 1495, width: 1448, height: 1086,
    inclusions: [tent(30, 30), tables(8), chairs(80)],
    // The first digit extends below FOR. A stepped mask preserves that label and the dollar glyph.
    price: { x: 152, y: 661, width: 313, height: 168, fontSize: 210, background: '#88f000', color: '#000000', maskPath: 'M168 661H465V829H152V680H168Z', preserveCurrency: true },
  },
  'linen-tent-package-tent-tables-chairs-tablecloths': {
    name: 'Linen Tent Package', approvedPrice: 745, width: 1402, height: 1122,
    inclusions: [tent(20, 20), tables(4), chairs(32), /\blinen tablecloths\b/],
    price: { x: 91, y: 801, width: 265, height: 107, fontSize: 134, background: '#d8a028', color: '#000810' },
  },
  'bounce-house-package-4-tables-24-chairs': {
    name: 'Bounce House Package – 4 Tables & 24 Chairs', approvedPrice: 525, width: 1448, height: 1086,
    inclusions: [bounce, tables(4), chairs(24)],
    price: { x: 52, y: 770, width: 353, height: 139, fontSize: 174, background: '#000000', color: '#a5ee00' },
  },
  'bounce-house-water-slide-combo-package': {
    name: 'Bounce House + Water Slide Combo Package', approvedPrice: 725, width: 1448, height: 1086,
    inclusions: [bounce, slide], exclusions: [/\b\d+\s+(?:tables|chairs)\b/],
    price: { x: 83, y: 752, width: 313, height: 133, fontSize: 166, background: '#000000', color: '#fadd00' },
  },
  'summer-splash-package-waterslide-tables-chairs': {
    name: 'Summer Splash Package', approvedPrice: 595, width: 1402, height: 1122,
    inclusions: [slide, tables(4), chairs(24)],
    price: { x: 64, y: 780, width: 278, height: 125, fontSize: 156, background: '#0080d8', color: '#ffffff' },
  },
  'kids-birthday-party-package-bounce-house-cotton-candy-tables-chairs': {
    name: 'Kids Birthday Party Package (Bounce House, Cotton Candy Machine, Tables & Chairs)', approvedPrice: 695, width: 1402, height: 1122,
    inclusions: [bounce, /\bcotton candy machine\b/, tables(4), chairs(24)],
    price: { x: 86, y: 796, width: 318, height: 125, fontSize: 156, background: '#000000', color: '#4af500' },
  },
  'graduation-party-package-small-seats-64': {
    name: 'Graduation Party Package - Small (Seats 64)', approvedPrice: 1045, width: 1536, height: 1024,
    inclusions: [tent(20, 30), tables(8), chairs(64)],
    // Keep the separate dollar glyph and ONLY heading; replace the numeric amount underneath.
    price: { x: 96, y: 530, width: 193, height: 81, fontSize: 100, background: '#000000', color: '#f8c030', maskPath: 'M96 530H289V600L280 611H96Z', preserveCurrency: true },
  },
  'graduation-party-package-large-seats-100': {
    name: 'Graduation Party Package - Large (Seats 100)', approvedPrice: 1595, width: 1402, height: 1122,
    inclusions: [tent(30, 30), tables(10), chairs(100)],
    price: { x: 71, y: 756, width: 353, height: 139, fontSize: 174, background: '#f8f8f8', color: '#001000' },
  },
  'backyard-bbq-party-package-tent-tables-chairs-popcorn-machine': {
    name: 'Backyard BBQ Party Package', approvedPrice: 725, width: 1426, height: 1103,
    inclusions: [tent(20, 20), tables(4), chairs(24), /\bpopcorn machine\b/],
    price: { x: 417, y: 585, width: 220, height: 120, fontSize: 150, background: '#002048', color: '#ff7000' },
  },
  'corporate-event-package-tent-tables-chairs-concessions': {
    name: 'Corporate Event Package', approvedPrice: 1145, width: 1448, height: 1086,
    inclusions: [tent(20, 20), tables(6), chairs(48), /\bpopcorn machine\b/, /\bcotton candy machine\b/, /\bsnow cone machine\b/],
    price: { x: 499, y: 730, width: 293, height: 129, fontSize: 160, background: '#f8e000', color: '#000000' },
  },
}

function normalized(value: string) {
  return value.toLowerCase().replace(/[′’']/g, '').replace(/×/g, 'x').replace(/\bsix\b/g, '6').replace(/\bone\b/g, '1')
    .replace(/[-–—]/g, ' ').replace(/\s+/g, ' ').trim()
}

/** All twelve audited party brochures are primary images; their galleries are empty. */
export function isNycPartyArtworkRequest(slug: string, index: number | null = null) {
  return index === null && Object.prototype.hasOwnProperty.call(MINOA_PARTY_ARTWORK, nycItemUrlSlug(slug))
}

/** Do not advertise a reviewed bundle after the published name or equipment changes. */
export function partyArtworkMatchesCatalog(slug: string, item: CatalogArtworkItem) {
  const approved = MINOA_PARTY_ARTWORK[nycItemUrlSlug(slug)]
  if (!approved || normalized(item.name) !== normalized(approved.name) || !item.description) return false
  // Match the actual inclusion clause, rather than an appended model/upgrade note.
  const inclusionClause = item.description.match(/\bincludes\s*:?\s+([^.!?]+)/i)?.[1]
  if (!inclusionClause) return false
  const description = normalized(inclusionClause)
  return approved.inclusions.every(pattern => pattern.test(description))
    && !(approved.exclusions || []).some(pattern => pattern.test(description))
}

/** Never read or proxy an upstream brochure with an obsolete printed rate/contact. */
export async function renderNycPartyPackageArtwork(slug: string, item: CatalogArtworkItem) {
  const publicSlug = nycItemUrlSlug(slug)
  const approved = MINOA_PARTY_ARTWORK[publicSlug]
  const cost = Number(item.cost)
  if (!approved || !Number.isFinite(cost) || cost <= 0 || !partyArtworkMatchesCatalog(publicSlug, item)) return null
  try {
    const bytes = await readFile(path.join(process.cwd(), 'public', 'images', 'nyc-party-minoa-style', publicSlug + '.png'))
    if (bytes.length < 12 || !bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return null
    const metadata = await sharp(bytes).metadata()
    if (metadata.format !== 'png' || !metadata.width || !metadata.height) return null
    const reference = 'NYC-Minoa-style-current-catalog'
    // At the approved rate, serve the owner's reviewed edit byte-for-byte.
    if (cost === approved.approvedPrice) return { bytes, contentType: 'image/png', reference }

    // Future catalog price changes replace only the calibrated printed-price region.
    const region = approved.price
    const formattedPrice = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(cost) ? 0 : 2, maximumFractionDigits: 2 }).format(cost)
    const price = region.preserveCurrency ? formattedPrice.slice(1) : formattedPrice
    const fontSize = Math.min(region.fontSize, (region.width - 6) / (price.length * 0.64))
    const mask = region.maskPath ? `<path d="${region.maskPath}" fill="${region.background}"/>` : `<rect x="${region.x}" y="${region.y}" width="${region.width}" height="${region.height}" fill="${region.background}"/>`
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${metadata.width}" height="${metadata.height}" viewBox="0 0 ${approved.width} ${approved.height}" preserveAspectRatio="none">${mask}<text x="${region.x + region.width / 2}" y="${region.y + region.height / 2 + fontSize * 0.34}" text-anchor="middle" font-family="DejaVu Sans,sans-serif" font-size="${fontSize}" font-weight="900" fill="${region.color}">${price}</text></svg>`
    return { bytes: await sharp(bytes).composite([{ input: Buffer.from(svg), left: 0, top: 0 }]).png().toBuffer(), contentType: 'image/png', reference }
  } catch {
    return null
  }
}
