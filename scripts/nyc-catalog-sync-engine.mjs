// Mirrors the live Syracuse public catalog into the NYC database.
//
// Reads ONLY public, read-only Syracuse endpoints (GET/HEAD /api/items,
// /api/categories, /api/item-image/<slug>). It never writes anywhere except the
// NYC database behind DATABASE_URL, and never touches customers, orders, payments
// or settings.
//
// Rules live in lib/nycCatalogCore.mjs (shared with the storefront and tests):
// exact Syracuse quantities, packages at the Syracuse price, every other item at
// clean(Syracuse x 1.70), NYC-localized copy, Syracuse photos served through the
// NYC /api/item-image proxy, and Syracuse suggested add-ons re-linked by slug.
//
// Safety:
//   - Syracuse unreachable: nothing is changed; the deploy is not blocked (the
//     previous NYC catalog stays live) unless --strict is passed.
//   - Syracuse suddenly lists far fewer items than NYC currently mirrors: nothing
//     is changed (protects against a partial/broken source response).
//   - All writes run in one transaction and are verified afterwards; a verification
//     failure exits non-zero so the deploy stops before the new release goes live.

import {
  SYRACUSE_ORIGIN,
  catalogParityReport,
  changedFields,
  desiredNycItem,
  isPackageItem,
  syracuseItemImageUrl,
  validateSyracuseCatalog,
} from '../lib/nycCatalogCore.mjs'

const USER_AGENT = 'Friendly-Party-Rental-NYC-catalog-sync/2.0 (+https://friendlypartyrentalnyc.com)'
const MIN_SOURCE_RATIO = 0.8

export class SourceUnavailableError extends Error {
  constructor(message) {
    super(message)
    this.name = 'SourceUnavailableError'
  }
}

/** Syracuse by default. Only a local test server may override it (CI). */
export function resolveSourceOrigin(env = process.env) {
  const override = typeof env.NYC_CATALOG_SOURCE_ORIGIN === 'string' ? env.NYC_CATALOG_SOURCE_ORIGIN.trim() : ''
  if (!override) return SYRACUSE_ORIGIN
  if (/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d{2,5})?$/.test(override)) return override
  throw new Error('NYC_CATALOG_SOURCE_ORIGIN may only point at a local test server')
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function request(fetchImpl, url, { method = 'GET', accept = 'application/json', timeoutMs = 20000 } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetchImpl(url, { method, cache: 'no-store', redirect: 'follow', signal: controller.signal, headers: { Accept: accept, 'User-Agent': USER_AGENT } })
  } finally {
    clearTimeout(timer)
  }
}

/** Live Syracuse /api/items (validated). Throws SourceUnavailableError on network/HTTP failure. */
export async function loadSyracuseCatalog({ fetchImpl = fetch, origin = SYRACUSE_ORIGIN, attempts = 3 } = {}) {
  let lastError = null
  for (let attempt = 1; attempt <= attempts; attempt++) {
    let payload
    try {
      const response = await request(fetchImpl, origin + '/api/items')
      if (!response.ok) throw new Error('HTTP ' + response.status)
      payload = await response.json()
    } catch (error) {
      lastError = error
      if (attempt < attempts) await sleep(1500 * attempt)
      continue
    }
    return validateSyracuseCatalog(payload)
  }
  throw new SourceUnavailableError('Syracuse catalog unavailable: ' + (lastError && lastError.message ? lastError.message : 'unknown error'))
}

/** Syracuse category display order by slug (best effort; empty map when unavailable). */
export async function loadSyracuseCategoryOrder({ fetchImpl = fetch, origin = SYRACUSE_ORIGIN } = {}) {
  const order = new Map()
  try {
    const response = await request(fetchImpl, origin + '/api/categories')
    if (!response.ok) return order
    const body = await response.json()
    const list = Array.isArray(body) ? body : body && Array.isArray(body.categories) ? body.categories : []
    list.forEach((category, index) => {
      if (category && typeof category.slug === 'string') order.set(category.slug, Number.isInteger(category.sortOrder) ? category.sortOrder : index)
    })
  } catch {
    // Category order is cosmetic; keep the current NYC order when unavailable.
  }
  return order
}

/** true = photo exists, false = Syracuse answered 404 (no photo), null = unknown (network error). */
async function probeImage(fetchImpl, url) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await request(fetchImpl, url, { method: 'HEAD', accept: 'image/*', timeoutMs: 20000 })
      if (response.status === 404) return false
      const type = (response.headers.get('content-type') || '').toLowerCase()
      if (response.ok && type.startsWith('image/')) return true
      if (response.ok) return false
    } catch {
      // retry once, then report unknown
    }
    if (attempt < 2) await sleep(750)
  }
  return null
}

/** Main photo + number of additional photos for every Syracuse item (null = unknown). */
export async function probeSyracusePhotos({ fetchImpl = fetch, origin = SYRACUSE_ORIGIN, items, concurrency = 6, maxAdditional = 12 }) {
  const photos = new Map()
  let next = 0
  async function worker() {
    while (next < items.length) {
      const item = items[next++]
      const main = await probeImage(fetchImpl, syracuseItemImageUrl(item.slug, null, origin))
      let additional = 0
      let known = main !== null
      for (let index = 0; index < maxAdditional && known; index++) {
        const found = await probeImage(fetchImpl, syracuseItemImageUrl(item.slug, index, origin))
        if (found === true) { additional++; continue }
        if (found === null) known = false
        break
      }
      photos.set(item.slug, { main, additional: known ? additional : null })
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()))
  return photos
}

const ITEM_SELECT = {
  id: true, slug: true, name: true, description: true, type: true, cost: true, quantity: true, sortOrder: true,
  displayToCustomer: true, scheduleProfile: true, categoryId: true, status: true, bookableAfter: true,
  bookableAfterMessage: true, specialDisplayName: true, setupArea: true, attendants: true, ageGroup: true,
  colorOptions: true, taxable: true, setupFee: true, suggestedAddonIds: true,
}

/** NYC items with short photo fingerprints (pictures may be large inline images, never loaded in full). */
async function loadNycItems(db) {
  const rows = await db.item.findMany({ select: ITEM_SELECT, orderBy: { slug: 'asc' } })
  const photos = await db.$queryRawUnsafe(
    'SELECT "slug", LEFT("picture", 400) AS "picturePrefix", COALESCE(LENGTH("picture"), 0)::int AS "pictureLength", ' +
    'COALESCE(array_length("additionalImages", 1), 0)::int AS "additionalCount", ' +
    '(SELECT string_agg(LEFT(x, 400), \'\u001f\') FROM unnest("additionalImages") AS x) AS "additionalPrefixes" FROM "Item"'
  )
  const bySlug = new Map(photos.map((row) => [row.slug, row]))
  return rows.map((row) => {
    const photo = bySlug.get(row.slug) || {}
    const pictureLength = Number(photo.pictureLength || 0)
    const picturePrefix = typeof photo.picturePrefix === 'string' ? photo.picturePrefix : null
    // Only short URL values can equal a desired URL; long inline images never do.
    const picture = pictureLength === 0 ? null : pictureLength <= 400 ? picturePrefix : '[inline-image:' + pictureLength + ']'
    const additionalImages = Number(photo.additionalCount || 0) === 0
      ? []
      : String(photo.additionalPrefixes || '').split('\u001f').map((value) => (value.length >= 400 ? '[inline-image]' : value))
    return { ...row, picture, additionalImages }
  })
}

function itemWriteData(desired, categoryId) {
  const data = {
    name: desired.name,
    description: desired.description,
    type: desired.type,
    cost: desired.cost,
    quantity: desired.quantity,
    sortOrder: desired.sortOrder,
    displayToCustomer: desired.displayToCustomer,
    scheduleProfile: desired.scheduleProfile,
    categoryId,
    status: desired.status,
    bookableAfter: desired.bookableAfter ? new Date(desired.bookableAfter) : null,
    bookableAfterMessage: desired.bookableAfterMessage,
    specialDisplayName: desired.specialDisplayName,
    setupArea: desired.setupArea,
    attendants: desired.attendants,
    ageGroup: desired.ageGroup,
    colorOptions: desired.colorOptions,
    taxable: desired.taxable,
    setupFee: desired.setupFee,
  }
  if ('picture' in desired) data.picture = desired.picture
  if ('additionalImages' in desired) data.additionalImages = desired.additionalImages
  return data
}

function pick(data, fields) {
  const out = {}
  for (const field of fields) if (field in data) out[field] = data[field]
  return out
}

/**
 * Runs the sync. With apply=false it only reports what would change.
 * Returns a JSON-safe report (aggregate counts + public slugs only).
 */
export async function runCatalogSync({ prisma, fetchImpl = fetch, origin = SYRACUSE_ORIGIN, apply = false, probePhotos = true, log = console.log } = {}) {
  const syracuseItems = await loadSyracuseCatalog({ fetchImpl, origin })
  const categoryOrder = await loadSyracuseCategoryOrder({ fetchImpl, origin })
  const photos = probePhotos ? await probeSyracusePhotos({ fetchImpl, origin, items: syracuseItems }) : new Map()
  const unknownPhotos = syracuseItems.filter((item) => !photos.has(item.slug) || photos.get(item.slug).main === null).map((item) => item.slug)
  const desiredList = syracuseItems.map((item, index) => desiredNycItem(item, index, photos.get(item.slug) || { main: null, additional: null }, origin))
  const noPhotoSlugs = desiredList.filter((row) => row.photoMissing).map((row) => row.slug)

  const beforeItems = await loadNycItems(prisma)
  const syracuseSlugs = new Set(syracuseItems.map((item) => item.slug))
  const mirroredPublic = beforeItems.filter((row) => row.displayToCustomer && syracuseSlugs.has(row.slug)).length
  const currentPublic = beforeItems.filter((row) => row.displayToCustomer).length
  if (currentPublic > 20 && syracuseItems.length < Math.floor(currentPublic * MIN_SOURCE_RATIO)) {
    throw new SourceUnavailableError('Syracuse listed ' + syracuseItems.length + ' items but NYC publishes ' + currentPublic + '; refusing to mirror a partial catalog')
  }

  // Categories: every Syracuse category exists in NYC with the Syracuse name,
  // pricing profile and order. NYC keeps its own category descriptions/photos.
  const sourceCategories = new Map()
  for (const item of syracuseItems) {
    if (sourceCategories.has(item.category.slug)) continue
    sourceCategories.set(item.category.slug, {
      slug: item.category.slug,
      name: typeof item.category.name === 'string' && item.category.name.trim() ? item.category.name.trim() : item.category.slug,
      pricingProfile: typeof item.category.pricingProfile === 'string' && item.category.pricingProfile ? item.category.pricingProfile : 'standard',
      sortOrder: categoryOrder.has(item.category.slug) ? categoryOrder.get(item.category.slug) : null,
    })
  }
  const beforeCategories = await prisma.category.findMany({ select: { id: true, slug: true, name: true, pricingProfile: true, sortOrder: true, displayToCustomer: true } })
  const categoryBySlug = new Map(beforeCategories.map((row) => [row.slug, row]))
  const categoryPlan = []
  for (const category of sourceCategories.values()) {
    const current = categoryBySlug.get(category.slug)
    if (!current) { categoryPlan.push({ action: 'create', category }); continue }
    const data = {}
    if (current.name !== category.name) data.name = category.name
    if (current.pricingProfile !== category.pricingProfile) data.pricingProfile = category.pricingProfile
    if (category.sortOrder !== null && current.sortOrder !== category.sortOrder) data.sortOrder = category.sortOrder
    if (current.displayToCustomer === false) data.displayToCustomer = true
    if (Object.keys(data).length) categoryPlan.push({ action: 'update', category, data })
  }

  const beforeBySlug = new Map(beforeItems.map((row) => [row.slug, row]))
  const itemPlan = { create: [], update: [], hide: [] }
  for (const desired of desiredList) {
    const current = beforeBySlug.get(desired.slug)
    if (!current) { itemPlan.create.push(desired.slug); continue }
    const categoryId = categoryBySlug.get(desired.categorySlug) ? categoryBySlug.get(desired.categorySlug).id : null
    const changes = changedFields(current, categoryId ? { ...desired, categoryId } : desired)
    if (changes.length) itemPlan.update.push({ slug: desired.slug, fields: changes })
  }
  for (const row of beforeItems) {
    if (row.displayToCustomer && !syracuseSlugs.has(row.slug)) itemPlan.hide.push(row.slug)
  }

  const plan = {
    source: origin,
    syracuseItems: syracuseItems.length,
    categoriesToCreate: categoryPlan.filter((row) => row.action === 'create').map((row) => row.category.slug),
    categoriesToUpdate: categoryPlan.filter((row) => row.action === 'update').map((row) => row.category.slug),
    itemsToCreate: itemPlan.create,
    itemsToUpdate: itemPlan.update.length,
    fieldsToUpdate: itemPlan.update.reduce((counts, row) => { for (const field of row.fields) counts[field] = (counts[field] || 0) + 1; return counts }, {}),
    publicItemsNotInSyracuseToHide: itemPlan.hide,
    syracuseItemsWithoutPhoto: noPhotoSlugs,
    photoChecksInconclusive: unknownPhotos,
    mirroredPublicBefore: mirroredPublic,
  }
  log(JSON.stringify({ step: 'plan', apply, ...plan }, null, 2))
  if (!apply) return { applied: false, plan }

  const syracuseIdToSlug = new Map(syracuseItems.map((item) => [item.id, item.slug]))
  await prisma.$transaction(async (tx) => {
    for (const row of categoryPlan) {
      if (row.action === 'create') {
        await tx.category.create({
          data: {
            name: row.category.name,
            slug: row.category.slug,
            pricingProfile: row.category.pricingProfile,
            displayToCustomer: true,
            sortOrder: row.category.sortOrder ?? 0,
            description: row.category.name + ' rentals from Friendly Party Rental NYC for Riverdale, the Bronx and Lower Westchester.',
            picture: origin + '/api/category-image/' + encodeURIComponent(row.category.slug),
          },
        })
      } else {
        await tx.category.update({ where: { slug: row.category.slug }, data: row.data })
      }
    }
    const categoryIds = new Map((await tx.category.findMany({ select: { id: true, slug: true } })).map((row) => [row.slug, row.id]))

    for (const desired of desiredList) {
      const categoryId = categoryIds.get(desired.categorySlug)
      if (!categoryId) throw new Error('Category missing after sync: ' + desired.categorySlug)
      const data = itemWriteData(desired, categoryId)
      const current = beforeBySlug.get(desired.slug)
      if (!current) {
        await tx.item.create({ data: { ...data, slug: desired.slug, picture: 'picture' in data ? data.picture : null, additionalImages: 'additionalImages' in data ? data.additionalImages : [] } })
        continue
      }
      const changes = changedFields(current, { ...desired, categoryId }).filter((field) => field !== 'suggestedAddonIds')
      if (changes.length) await tx.item.update({ where: { slug: desired.slug }, data: pick(data, changes) })
    }

    // Suggested add-ons reference Syracuse item IDs; re-link them to the NYC items with the same slug.
    const nycIdBySlug = new Map((await tx.item.findMany({ select: { id: true, slug: true } })).map((row) => [row.slug, row.id]))
    for (const source of syracuseItems) {
      const mapped = (Array.isArray(source.suggestedAddonIds) ? source.suggestedAddonIds : [])
        .map((id) => nycIdBySlug.get(syracuseIdToSlug.get(id)))
        .filter((id) => typeof id === 'string')
      const current = beforeBySlug.get(source.slug)
      const currentIds = current && Array.isArray(current.suggestedAddonIds) ? current.suggestedAddonIds : []
      if (!current || JSON.stringify(currentIds) !== JSON.stringify(mapped)) {
        await tx.item.update({ where: { slug: source.slug }, data: { suggestedAddonIds: mapped } })
      }
    }

    if (itemPlan.hide.length) {
      await tx.item.updateMany({ where: { slug: { in: itemPlan.hide } }, data: { displayToCustomer: false } })
    }
  }, { maxWait: 20000, timeout: 180000 })

  // Verify from the database, exactly as the storefront will read it.
  const afterItems = await loadNycItems(prisma)
  const afterCategories = await prisma.category.findMany({ select: { slug: true, displayToCustomer: true } })
  const categorySlugById = new Map((await prisma.category.findMany({ select: { id: true, slug: true } })).map((row) => [row.id, row.slug]))
  const withCategories = afterItems.map((row) => ({ ...row, category: { slug: categorySlugById.get(row.categoryId) } }))
  const report = catalogParityReport({ syracuseItems, nycItems: withCategories, nycCategories: afterCategories, noPhotoSlugs })
  const afterBySlug = new Map(afterItems.map((row) => [row.slug, row]))
  const photoMismatches = []
  const addonMismatches = []
  const nycIdBySlugAfter = new Map(afterItems.map((row) => [row.slug, row.id]))
  for (const desired of desiredList) {
    const row = afterBySlug.get(desired.slug)
    if (!row) continue
    if ('picture' in desired && row.picture !== desired.picture) photoMismatches.push(desired.slug)
    if ('additionalImages' in desired && JSON.stringify(row.additionalImages) !== JSON.stringify(desired.additionalImages)) photoMismatches.push(desired.slug + '#additional')
  }
  for (const source of syracuseItems) {
    const expected = (source.suggestedAddonIds || []).map((id) => nycIdBySlugAfter.get(syracuseIdToSlug.get(id))).filter(Boolean)
    const row = afterBySlug.get(source.slug)
    if (row && JSON.stringify(row.suggestedAddonIds || []) !== JSON.stringify(expected)) addonMismatches.push(source.slug)
  }
  const failures = {
    missingSyracuseSlugs: report.missingSyracuseSlugs.length,
    quantityMismatches: report.quantityMismatches.length,
    priceMismatches: report.priceMismatches.length,
    nameMismatches: report.nameMismatches.length,
    categoryMismatches: report.categoryMismatches.length,
    statusMismatches: report.statusMismatches.length,
    configMismatches: report.configMismatches.length,
    visibilityMismatches: report.visibilityMismatches.length,
    publicItemsNotInSyracuse: report.publicItemsNotInSyracuse.length,
    nonPackagePricesWithCents: report.nonPackagePricesWithCents.length,
    invalidPublicPrices: report.invalidPublicPrices.length,
    customerCopyProblems: report.customerCopyProblems.length,
    photoMismatches: photoMismatches.length,
    addonMismatches: addonMismatches.length,
  }
  const summary = {
    step: 'verified',
    counts: report.counts,
    packagesInSyracuse: syracuseItems.filter((item) => isPackageItem(item)).length,
    syracuseItemsWithoutPhoto: noPhotoSlugs,
    photoChecksInconclusive: unknownPhotos,
    failures,
  }
  log(JSON.stringify(summary, null, 2))
  const failed = Object.entries(failures).filter(([, count]) => count > 0)
  if (failed.length) {
    log(JSON.stringify({ step: 'verification-details', report, photoMismatches, addonMismatches }, null, 2))
    throw new Error('NYC catalog verification failed: ' + failed.map(([name, count]) => name + '=' + count).join(', '))
  }
  return { applied: true, plan, summary }
}
