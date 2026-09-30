import { NYC_WEDDING_IMAGES } from '@/lib/nycWeddingImages'
import { prisma } from '@/lib/prisma'
import { IMAGE_CACHE_BUST } from '@/lib/imageVersion'
import { WEDDING_PACKAGES } from '@/lib/utils'
import { localizeNycPublicCopy } from '@/lib/nycPublicCopy'

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
    select: { name: true, cost: true, displayToCustomer: true, status: true },
  })

  const approvedCostByName = new Map<string, number>()
  for (const item of items) {
    const cost = Number(item.cost)
    if (item.displayToCustomer && item.status === 'Available' && Number.isFinite(cost) && cost > 0) approvedCostByName.set(item.name, cost)
  }

  return packages.map((p) => {
    const fallback = fallbackById.get(p.id)
    const approvedPrice = approvedCostByName.get(`Wedding Package - ${p.name}`)
    const image = NYC_WEDDING_IMAGES[p.id] || (p.image
      ? `/api/wedding-package-image/${p.id}?v=${p.updatedAt ? new Date(p.updatedAt).toISOString() : IMAGE_CACHE_BUST}`
      : fallback?.image || null)
    const description = localizeNycPublicCopy(p.description) || fallback?.description || ''
    const packageItems = Array.isArray(p.items) && p.items.length ? p.items : (fallback?.items || [])

    return {
      ...p,
      image,
      description,
      items: packageItems,
      price: approvedPrice ?? null,
    }
  })
}
