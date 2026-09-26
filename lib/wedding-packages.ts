import { NYC_WEDDING_IMAGES } from '@/lib/nycWeddingImages'
import { prisma } from '@/lib/prisma'
import { IMAGE_CACHE_BUST } from '@/lib/imageVersion'
import { WEDDING_PACKAGES } from '@/lib/utils'
import { localizeNycPublicCopy } from '@/lib/nycPublicCopy'

const fallbackById = new Map(WEDDING_PACKAGES.map((pkg) => [pkg.id, pkg]))

// Greenville keeps its own WeddingPackage rows and inventory prices. The five
// canonical package visuals are intentionally locked to the exact public NY
// artwork copied into the SC deployment at build time. No NY customer, order,
// payment, account, or runtime storefront data is used here.
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
      price: liveCost !== undefined && liveCost !== null ? liveCost : p.price,
    }
  })
}
