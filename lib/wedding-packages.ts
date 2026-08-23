import { prisma } from '@/lib/prisma'
import { IMAGE_CACHE_BUST } from '@/lib/imageVersion'

// Wedding packages are advertised on the public marketing page with a
// price stored on the WeddingPackage row, but the actual chargeable item
// lives in the real inventory (synced from ERS) as an Item named
// "Wedding Package - <name>".
// This keeps the marketing price from ever drifting out of sync with
// what a customer is actually charged: whenever a matching live Item
// exists, its current cost wins.
// The package image is stored in the DB as a raw base64 string, so it is
// converted here to a lightweight served URL instead of ever being
// embedded directly in page HTML/RSC payloads.
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
    const liveCost = costByName.get(`Wedding Package - ${p.name}`)
    const withImage = { ...p, image: p.image ? `/api/wedding-package-image/${p.id}?v=${p.updatedAt ? new Date(p.updatedAt).toISOString() : IMAGE_CACHE_BUST}` : p.image }
    return liveCost !== undefined && liveCost !== null ? { ...withImage, price: liveCost } : withImage
})
}
