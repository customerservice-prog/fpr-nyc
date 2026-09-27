export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PUBLIC_CATEGORIES } from '@/lib/utils'
import { getSyncedWeddingPackages } from '@/lib/wedding-packages'
import { IMAGE_CACHE_BUST } from '@/lib/imageVersion'
import { getHomepagePopularItems } from '@/lib/homepageMerchandising'

// GET: return the real, current business data needed to render the actual
// Home page inside the editor canvas (categories, popular items, bounce
// items, wedding packages). This mirrors the query logic in
// app/(public)/page.tsx exactly, so the editor canvas never shows fake or
// empty placeholder data - it shows the real homepage.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let categoryPictures: Record<string, string> = {}
  let extraCategories: (typeof PUBLIC_CATEGORIES)[number][] = []
  try {
    const dbCategories = await prisma.category.findMany({ select: { slug: true, name: true, picture: true, updatedAt: true, displayToCustomer: true, sortOrder: true } })
    categoryPictures = Object.fromEntries(
      dbCategories.filter((c) => c.picture).map((c) => [c.slug, `/api/category-image/${c.slug}?v=${c.updatedAt ? new Date(c.updatedAt).toISOString() : IMAGE_CACHE_BUST}`])
    )
    const knownSlugs = new Set(PUBLIC_CATEGORIES.map((c) => c.slug))
    extraCategories = dbCategories.filter((c) => c.displayToCustomer && !knownSlugs.has(c.slug)).sort((a, b) => a.sortOrder - b.sortOrder).map((c) => ({ id: c.slug, name: c.name, slug: c.slug, href: `/category/${c.slug}`, image: categoryPictures[c.slug] || '/images/order-by-date.png', count: 0 }))
  } catch {
    categoryPictures = {}
  }
  const displayCategories = [...PUBLIC_CATEGORIES, ...extraCategories]

  const mobileCategorySlugs = ['tent-rentals','bounce-house-rentals','table-chair-rentals','weddings','linen-rentals','dance-floor-stage-rentals','photobooth-rentals','concession-machine-rentals','yard-game-rentals','event-lighting-rentals','generator-rentals','heater-fan-rentals','party-rental-packages','beverage-food-service','foam-party-machine-rentals','inflatable-movie-screen-rentals','party-rental-accessories','restroom-rentals']
  const mobileCategories = mobileCategorySlugs
    .map((slug) => displayCategories.find((c) => c.slug === slug))
    .filter((c): c is (typeof PUBLIC_CATEGORIES)[number] => Boolean(c))
    .map((c) => ({ slug: c.slug, name: c.slug === 'bounce-house-rentals' ? 'Bounce Houses & Water Slides' : c.name.replace(' — Riverdale, NY', ''), href: c.href, image: categoryPictures[c.slug] || c.image }))

  let popularItemsRaw: any[] = []
  try { popularItemsRaw = await getHomepagePopularItems(8) } catch { popularItemsRaw = [] }

  let bounceItemsRaw: any[] = []
  try {
    bounceItemsRaw = await prisma.item.findMany({ where: { displayToCustomer: true, status: 'Available', category: { slug: 'bounce-house-rentals' } }, orderBy: { sortOrder: 'asc' }, take: 12, select: { id: true, name: true, specialDisplayName: true, slug: true, cost: true, picture: true, category: { select: { name: true } } } })
  } catch { bounceItemsRaw = [] }

  let packages: any[] = []
  try {
    const packagesRaw = await getSyncedWeddingPackages()
    packages = packagesRaw.map((p) => ({ ...p, items: Array.isArray(p.items) ? (p.items as string[]) : [], image: p.image || undefined }))
  } catch { packages = [] }

  const mapItem = (it: any) => ({ id: it.id, name: it.specialDisplayName || it.name, slug: it.slug, cost: it.cost, picture: it.slug ? `/api/item-image/${it.slug}?v=${IMAGE_CACHE_BUST}` : (it.picture || null), status: null, category: it.category })

  return NextResponse.json({
    categories: mobileCategories,
    popularItems: popularItemsRaw.map(mapItem),
    bounceItems: bounceItemsRaw.map(mapItem),
    packages,
    weddingImage: packages[0]?.image || null,
  })
}
