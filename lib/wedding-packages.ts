import { prisma } from '@/lib/prisma'
import { IMAGE_CACHE_BUST } from '@/lib/imageVersion'
import { WEDDING_PACKAGES } from '@/lib/utils'
import { localizeScPublicCopy } from '@/lib/scPublicCopy'

const fallbackById = new Map(WEDDING_PACKAGES.map((pkg) => [pkg.id, pkg]))

// The public wedding page uses the real SC WeddingPackage rows, while matching
// inventory items remain the source of truth for the price a customer pays.
// If an older SC package row has no stored image/description yet, use the
// curated package fallback so the storefront never renders an empty card.
export async function getSyncedWeddingPackages() {
  const packages = await prisma.weddingPackage.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })

  const items = await prisma.item.findMany({
    where: { name: { in: packages.map((p) => `Wedding Package - ${p.name}`) } },
    select: { name: true, cost: true },
  })

  const costByName = new Map(items.map((i) => [i.name, i.cost]))

  return packages.map((p) => {
    const fallback = fallbackById.get(p.id)
    const liveCost = costByName.get(`Wedding Package - ${p.name}`)
    const image = p.image
      ? `/api/wedding-package-image/${p.id}?v=${p.updatedAt ? new Date(p.updatedAt).toISOString() : IMAGE_CACHE_BUST}`
      : fallback?.image || null
    const description = localizeScPublicCopy(p.description) || fallback?.description || ''
    const packageItems = Array.isArray(p.items) && p.items.length ? p.items : (fallback?.items || [])

    return {
      ...p,
      image,
      description,
      items: packageItems,
      price: liveCost !== undefined && liveCost !== null ? liveCost : p.price,
    }
  })
}
