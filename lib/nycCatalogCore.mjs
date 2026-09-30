// NYC catalog rules shared by the Syracuse catalog sync scripts (Node), the public
// storefront (Next.js) and the tests. Pure JavaScript: no Prisma, network or
// Next.js imports, so every rule here can be unit tested and runs unchanged in the
// Railway pre-deploy step.
//
// Owner decisions (2026-09-30):
//   - NYC mirrors the live Syracuse catalog item-for-item by slug: same name,
//     category, details, photos and EXACTLY the same quantity.
//   - Packages keep the Syracuse price unchanged. A package is any item whose name,
//     slug, category name or category slug contains "package".
//   - Every other item is priced at the Syracuse price x 1.70, shown as a clean
//     customer-facing price with no cents (see cleanNycPrice).
//   - Customer-facing copy never names Syracuse / Central New York: the NYC store
//     serves Riverdale, selected Bronx neighborhoods and Lower Westchester.

export const SYRACUSE_ORIGIN = 'https://www.friendlypartyrental.com'
export const NYC_PRICE_MULTIPLIER = 1.7
export const NYC_BRAND_NAME = 'Friendly Party Rental NYC'
export const NYC_SERVICE_AREA_PHRASE = 'Riverdale, the Bronx and Lower Westchester'

const round2 = (value) => Math.round(Number(value) * 100) / 100

/** True for packages: name, slug, category name or category slug contains "package". */
export function isPackageItem(item) {
  if (!item || typeof item !== 'object') return false
  const category = item.category && typeof item.category === 'object' ? item.category : {}
  const text = [item.name, item.slug, category.name, category.slug, item.categoryName, item.categorySlug]
    .filter((value) => typeof value === 'string')
    .join(' ')
    .toLowerCase()
  return text.includes('package')
}

/**
 * Customer-facing NYC price for a raw 1.70 value (no cents):
 *   - exact whole-dollar results stay unchanged ($425, $595, $765)
 *   - under $10: round UP to the next whole dollar ($4.25 -> $5)
 *   - $10-$99.99: nearest whole dollar ($20.38 -> $20, $59.50 -> $60)
 *   - $100-$499.99: nearest $5 ($467.50 -> $470)
 *   - $500-$999.99: nearest $10 ($933.30 -> $930)
 *   - $1,000+: nearest $25
 */
export function cleanNycPrice(raw) {
  const value = round2(raw)
  if (!Number.isFinite(value) || value <= 0) throw new Error('Invalid NYC price: ' + raw)
  if (Number.isInteger(value)) return value
  if (value < 10) return Math.ceil(value)
  if (value < 100) return Math.round(value)
  if (value < 500) return Math.round(value / 5) * 5
  if (value < 1000) return Math.round(value / 10) * 10
  return Math.round(value / 25) * 25
}

/** NYC price for a live Syracuse item: packages unchanged, everything else clean(Syracuse x 1.70). */
export function nycPriceForSyracuseItem(item) {
  const cost = Number(item && item.cost)
  if (!Number.isFinite(cost) || cost <= 0) throw new Error('Invalid Syracuse price for ' + (item && item.slug))
  if (isPackageItem(item)) return round2(cost)
  return cleanNycPrice(round2(cost * NYC_PRICE_MULTIPLIER))
}

export function formatUsd(value) {
  const amount = Number(value)
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const PRICE_SENTENCE = /Starting at\s*\$\s?\d[\d,]*(?:\.\d{1,2})?(\s*\/\s*(?:day|event|hour|night|weekend|week))?/gi

// Ordered: specific phrases first, then generic place names. Every replacement is
// idempotent, so localized text can safely be localized again at render time.
const PLACE_REPLACEMENTS = [
  [/Serving Syracuse and the surrounding Central New York area/gi, 'Serving ' + NYC_SERVICE_AREA_PHRASE],
  [/Serving (?:the )?(?:greater )?Syracuse(?: area)?(?: and (?:the )?(?:surrounding )?Central New York(?: area)?)?/gi, 'Serving ' + NYC_SERVICE_AREA_PHRASE],
  [/\bin Syracuse,?\s*NY and (?:the surrounding )?Central New York(?: area)?/gi, 'in ' + NYC_SERVICE_AREA_PHRASE],
  [/\bat your Syracuse,?\s*NY event/gi, 'at your Riverdale, Bronx or Lower Westchester event'],
  [/\bNorth Syracuse\b/gi, 'Riverdale'],
  [/\bSyracuse,?\s*(?:NY|New York)\b/gi, 'Riverdale, NY'],
  [/\bMinoa,?\s*(?:NY|New York)\b/gi, 'Riverdale, NY'],
  [/\b(?:the )?(?:surrounding )?Central New York(?: area| region)?\b/gi, NYC_SERVICE_AREA_PHRASE],
  [/\bCentral NY\b/gi, NYC_SERVICE_AREA_PHRASE],
  [/\bUpstate New York\b/gi, 'New York'],
  [/\bOnondaga County\b/gi, 'Westchester County'],
  [/\bCNY\b/g, 'NYC'],
  [/\bSyracuse\b/gi, 'Riverdale'],
  [/\bMinoa\b/gi, 'Riverdale'],
  // Brand: the NYC store is "Friendly Party Rental NYC" (legal-entity mentions stay).
  [/\bFriendly Party Rental\b(?!\s*(?:NYC|L\.?L\.?C\.?|,?\s*LLC))/g, NYC_BRAND_NAME],
]

/**
 * Localizes catalog copy copied from the Syracuse store for the NYC storefront.
 * `price` (optional) is the NYC price used for "Starting at $X/day" sentences; when
 * no price is given those sentences are removed rather than showing another
 * store's price.
 */
/**
 * @param {string | null | undefined} value
 * @param {{ price?: number | null }} [options]
 * @returns {string}
 */
export function localizeNycCatalogText(value, options = {}) {
  let text = typeof value === 'string' ? value : ''
  if (!text.trim()) return ''
  const price = Number(options && options.price)
  const hasPrice = Number.isFinite(price) && price > 0
  text = text.replace(PRICE_SENTENCE, (match, unit) => {
    if (!hasPrice) return '\u0000'
    return 'Starting at ' + formatUsd(price) + (unit ? unit.replace(/\s+/g, '') : '')
  })
  if (!hasPrice) {
    // Drop the whole price sentence (and the space after it).
    text = text.replace(/\u0000[^.!?\n]*[.!?]?\s*/g, '')
  }
  for (const [pattern, replacement] of PLACE_REPLACEMENTS) text = text.replace(pattern, replacement)
  return text.replace(/[ \t]{2,}/g, ' ').trim()
}

/** Words that must never appear in NYC customer-facing catalog copy. */
export const WRONG_MARKET_PATTERN = /\b(?:syracuse|minoa|central new york|central ny|cny|onondaga|upstate|costello|greenville|south carolina|spartanburg|simpsonville)\b/i

/** Returns the wrong-market words found in `value` (empty array when clean). */
export function wrongMarketTerms(value) {
  const text = typeof value === 'string' ? value : ''
  const found = new Set()
  const pattern = new RegExp(WRONG_MARKET_PATTERN.source, 'gi')
  let match
  while ((match = pattern.exec(text))) found.add(match[0].toLowerCase())
  return [...found]
}

/** Dollar amounts mentioned in text, e.g. "$2,295.00" -> 2295. */
export function dollarAmountsIn(value) {
  const text = typeof value === 'string' ? value : ''
  const amounts = []
  const pattern = /\$\s?(\d[\d,]*(?:\.\d{1,2})?)/g
  let match
  while ((match = pattern.exec(text))) amounts.push(Number(match[1].replace(/,/g, '')))
  return amounts
}

/** Syracuse public image URL for an item photo (index = additional photo position). */
/**
 * @param {string} slug
 * @param {number | null} [index]
 * @param {string} [origin]
 * @returns {string}
 */
export function syracuseItemImageUrl(slug, index, origin = SYRACUSE_ORIGIN) {
  const base = origin.replace(/\/$/, '') + '/api/item-image/' + encodeURIComponent(slug)
  return index === undefined || index === null ? base : base + '?index=' + Number(index)
}

function normalizeText(value) {
  return value === null || value === undefined ? '' : String(value)
}

function normalizeAttendants(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isInteger(number) ? number : null
}

function normalizeSetupFee(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function normalizeDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toISOString() : null
}

/** Validates the live Syracuse /api/items payload. Throws on anything unsafe to mirror. */
/**
 * @param {any} payload
 * @returns {any[]}
 */
export function validateSyracuseCatalog(payload) {
  const items = payload && Array.isArray(payload.items) ? payload.items : null
  if (!items || items.length === 0) throw new Error('Syracuse catalog returned no items')
  const seen = new Set()
  for (const item of items) {
    const slug = item && typeof item.slug === 'string' ? item.slug.trim() : ''
    if (!slug) throw new Error('Syracuse item is missing a slug')
    if (seen.has(slug)) throw new Error('Duplicate Syracuse slug: ' + slug)
    seen.add(slug)
    if (typeof item.name !== 'string' || !item.name.trim()) throw new Error('Syracuse item has no name: ' + slug)
    if (!item.category || typeof item.category.slug !== 'string' || !item.category.slug) throw new Error('Syracuse item has no category: ' + slug)
    const quantity = Number(item.quantity)
    if (!Number.isInteger(quantity) || quantity < 0) throw new Error('Invalid Syracuse quantity for ' + slug + ': ' + item.quantity)
    const cost = Number(item.cost)
    if (!Number.isFinite(cost) || cost <= 0) throw new Error('Invalid Syracuse price for ' + slug + ': ' + item.cost)
  }
  return items
}

/**
 * The NYC record every Syracuse item must have. `image` describes the Syracuse
 * photos: { main: true|false|null, additional: number|null } where null = unknown
 * (keep whatever NYC already has). An item Syracuse shows without any photo is kept
 * in NYC (same slug, stock and price) but not published, so NYC never shows a
 * placeholder photo; it publishes automatically once Syracuse adds a photo.
 */
export function desiredNycItem(source, index, image = { main: null, additional: null }, origin = SYRACUSE_ORIGIN) {
  const price = nycPriceForSyracuseItem(source)
  const syracusePublic = source.displayToCustomer !== false
  const photoMissing = image && image.main === false
  const desired = {
    slug: source.slug,
    name: source.name.trim(),
    description: localizeNycCatalogText(source.description, { price }) || null,
    type: normalizeText(source.type) || 'Regular',
    cost: price,
    quantity: Number(source.quantity),
    sortOrder: index,
    displayToCustomer: syracusePublic && !photoMissing,
    scheduleProfile: source.scheduleProfile ?? null,
    categorySlug: source.category.slug,
    status: normalizeText(source.status) || 'Available',
    bookableAfter: normalizeDate(source.bookableAfter),
    bookableAfterMessage: source.bookableAfterMessage ?? null,
    specialDisplayName: source.specialDisplayName ?? null,
    setupArea: source.setupArea ?? null,
    attendants: normalizeAttendants(source.attendants),
    ageGroup: source.ageGroup ?? null,
    colorOptions: Array.isArray(source.colorOptions) ? source.colorOptions.filter((color) => typeof color === 'string') : [],
    taxable: source.taxable !== false,
    setupFee: normalizeSetupFee(source.setupFee),
    isPackage: isPackageItem(source),
    syracusePublic,
    photoMissing: !!photoMissing,
  }
  if (image && image.main === true) desired.picture = syracuseItemImageUrl(source.slug, null, origin)
  if (image && image.main === false) desired.picture = null
  if (image && Number.isInteger(image.additional)) {
    desired.additionalImages = Array.from({ length: image.additional }, (_, i) => syracuseItemImageUrl(source.slug, i, origin))
  }
  return desired
}

const COMPARED_FIELDS = [
  'name', 'description', 'type', 'cost', 'quantity', 'sortOrder', 'displayToCustomer', 'scheduleProfile',
  'status', 'bookableAfter', 'bookableAfterMessage', 'specialDisplayName', 'setupArea', 'attendants',
  'ageGroup', 'colorOptions', 'taxable', 'setupFee', 'picture', 'additionalImages', 'suggestedAddonIds',
]

function comparable(field, value) {
  if (field === 'bookableAfter') return normalizeDate(value)
  if (field === 'cost' || field === 'setupFee') return value === null || value === undefined ? null : round2(value)
  if (field === 'colorOptions' || field === 'additionalImages' || field === 'suggestedAddonIds') return JSON.stringify(Array.isArray(value) ? value : [])
  if (value === undefined) return null
  return value
}

/** Fields of an NYC row that differ from the desired record (only fields present in `desired`). */
export function changedFields(current, desired) {
  const changes = []
  for (const field of COMPARED_FIELDS) {
    if (!(field in desired)) continue
    if (comparable(field, current ? current[field] : undefined) !== comparable(field, desired[field])) changes.push(field)
  }
  if ('categoryId' in desired && (!current || current.categoryId !== desired.categoryId)) changes.push('categoryId')
  return changes
}

/**
 * Compares the live Syracuse catalog with the NYC catalog.
 * `nycItems` rows need: slug, name, cost, quantity, displayToCustomer, status,
 * description, category {slug}, colorOptions, attendants, ... (see COMPARED_FIELDS).
 * Returns aggregate counts plus the offending slugs (Syracuse slugs are public data).
 */
/**
 * @param {{ syracuseItems: any[], nycItems: any[], nycCategories?: Array<{ slug: string, displayToCustomer?: boolean }> | null, noPhotoSlugs?: string[] }} input
 */
export function catalogParityReport({ syracuseItems, nycItems, nycCategories = null, noPhotoSlugs = [] }) {
  const withoutPhoto = new Set(noPhotoSlugs)
  const nycBySlug = new Map(nycItems.map((row) => [row.slug, row]))
  const syracuseSlugs = new Set(syracuseItems.map((row) => row.slug))
  const missing = []
  const quantityMismatches = []
  const priceMismatches = []
  const nameMismatches = []
  const categoryMismatches = []
  const statusMismatches = []
  const configMismatches = []
  const visibilityMismatches = []
  const copyProblems = []
  syracuseItems.forEach((source, index) => {
    const row = nycBySlug.get(source.slug)
    if (!row) { missing.push(source.slug); return }
    const desired = desiredNycItem(source, index)
    if (Number(row.quantity) !== desired.quantity) quantityMismatches.push({ slug: source.slug, nyc: row.quantity, syracuse: desired.quantity })
    if (round2(row.cost) !== desired.cost) priceMismatches.push({ slug: source.slug, nyc: row.cost, expected: desired.cost })
    if (row.name !== desired.name) nameMismatches.push(source.slug)
    const rowCategory = row.category && row.category.slug ? row.category.slug : row.categorySlug
    if (rowCategory !== desired.categorySlug) categoryMismatches.push({ slug: source.slug, nyc: rowCategory, syracuse: desired.categorySlug })
    if (normalizeText(row.status) !== desired.status) statusMismatches.push(source.slug)
    const configFields = ['type', 'scheduleProfile', 'bookableAfter', 'bookableAfterMessage', 'specialDisplayName', 'setupArea', 'attendants', 'ageGroup', 'colorOptions', 'taxable', 'setupFee']
    const differing = configFields.filter((field) => comparable(field, row[field]) !== comparable(field, desired[field]))
    if (differing.length) configMismatches.push({ slug: source.slug, fields: differing })
    const shouldBePublic = desired.syracusePublic && !withoutPhoto.has(source.slug)
    if (!!row.displayToCustomer !== shouldBePublic) visibilityMismatches.push(source.slug)
    const description = typeof row.description === 'string' ? row.description : ''
    const terms = wrongMarketTerms(description)
    const wrongPrices = desired.isPackage ? [] : dollarAmountsIn(description).filter((amount) => round2(amount) !== desired.cost)
    if (terms.length || wrongPrices.length) copyProblems.push({ slug: source.slug, terms, wrongPrices })
  })
  const publicRows = nycItems.filter((row) => row.displayToCustomer)
  const extraPublic = publicRows.filter((row) => !syracuseSlugs.has(row.slug)).map((row) => row.slug)
  const packages = nycItems.filter((row) => isPackageItem(row))
  const nonPackages = nycItems.filter((row) => !isPackageItem(row))
  const publicNonPackages = publicRows.filter((row) => !isPackageItem(row))
  const centsPrices = publicNonPackages.filter((row) => !Number.isInteger(round2(row.cost))).map((row) => row.slug)
  const invalidPrices = publicRows.filter((row) => !Number.isFinite(Number(row.cost)) || Number(row.cost) <= 0).map((row) => row.slug)
  return {
    counts: {
      syracuseItems: syracuseItems.length,
      syracusePublicItems: syracuseItems.filter((row) => row.displayToCustomer !== false).length,
      categories: nycCategories === null ? null : nycCategories.length,
      publicCategories: nycCategories === null ? null : nycCategories.filter((row) => row.displayToCustomer !== false && nycItems.some((item) => item.displayToCustomer && (item.category && item.category.slug) === row.slug)).length,
      totalItems: nycItems.length,
      publicItems: publicRows.length,
      hiddenItems: nycItems.length - publicRows.length,
      packages: packages.length,
      publicPackages: publicRows.filter((row) => isPackageItem(row)).length,
      nonPackages: nonPackages.length,
      publicNonPackages: publicNonPackages.length,
    },
    missingSyracuseSlugs: missing,
    quantityMismatches,
    priceMismatches,
    nameMismatches,
    categoryMismatches,
    statusMismatches,
    configMismatches,
    visibilityMismatches,
    publicItemsNotInSyracuse: extraPublic,
    nonPackagePricesWithCents: centsPrices,
    invalidPublicPrices: invalidPrices,
    customerCopyProblems: copyProblems,
  }
}
