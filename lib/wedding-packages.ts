import { NYC_WEDDING_IMAGES } from '@/lib/nycWeddingImages'
import { prisma } from '@/lib/prisma'
import { IMAGE_CACHE_BUST } from '@/lib/imageVersion'
import { WEDDING_PACKAGES } from '@/lib/utils'
import { localizeNycPublicCopy } from '@/lib/nycPublicCopy'
import { weddingPackageCatalogDetails } from '@/lib/weddingPackageCatalog'

const fallbackById = new Map(WEDDING_PACKAGES.map((pkg) => [pkg.id, pkg]))

// The five canonical package visuals are locked to the shared public Friendly
// Party Rental artwork. No other location's customer, order, payment, account,
// or runtime storefront data is used here.
//
// Prices: a package price is shown only from its published, priced NYC catalog
// item ("Wedding Package - <name>", the item checkout sells). WeddingPackage.price
// and the WEDDING_PACKAGES fallback hold prices copied from another location's
// storefront, so they are never shown on their own: price is null ("Price on
// request") until the owner approves and publishes the NYC catalog item.
export async function getSyncedWeddingPackages() {
  const packages = await prisma.weddingPackage.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })

  const items = await prisma.item.findMany({
    where: { name: { in: packages.map((p) => `Wedding Package - ${p.name}`) } },
    select: { name: true, cost: true, description: true, displayToCustomer: true, status: true },
  })

  const approvedCatalogByName = new Map<string, { cost: number; description: string | null }>()
  for (const item of items) {
    const cost = Number(item.cost)
    if (item.displayToCustomer && item.status === 'Available' && Number.isFinite(cost) && cost > 0) approvedCatalogByName.set(item.name, { cost, description: item.description })
  }

  return packages.map((p) => {
    const fallback = fallbackById.get(p.id)
    const approvedCatalog = approvedCatalogByName.get(`Wedding Package - ${p.name}`)
    const image = NYC_WEDDING_IMAGES[p.id] || (p.image
      ? `/api/wedding-package-image/${p.id}?v=${p.updatedAt ? new Date(p.updatedAt).toISOString() : IMAGE_CACHE_BUST}`
      : fallback?.image || null)
    // WeddingPackage rows were copied with older package scopes. Use the published
    // NYC sale item's description for quantities, guest count and exclusions too.
    const description = localizeNycPublicCopy(approvedCatalog?.description) || ''
    const details = weddingPackageCatalogDetails(description)

    return {
      ...p,
      image,
      description,
      guests: details.guests,
      items: details.items,
      price: approvedCatalog?.cost ?? null,
    }
  })
}
