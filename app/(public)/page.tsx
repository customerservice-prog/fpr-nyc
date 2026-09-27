import { headers } from 'next/headers'
import ResponsiveHome from '@/components/public/ResponsiveHome'
import NycHomeSeo from '@/components/public/NycHomeSeo'
import { nycPageMetadata } from '@/lib/nycSeo'
import { initialHomeDevice } from '@/lib/homeDevice'
import { PUBLIC_CATEGORIES } from '@/lib/utils'
import { DEFAULT_HOME_CONTENT } from '@/lib/homeContent'
import { getSyncedWeddingPackages } from '@/lib/wedding-packages'
import { getHomepagePopularItems } from '@/lib/homepageMerchandising'
import { IMAGE_CACHE_BUST } from '@/lib/imageVersion'
import { prisma } from '@/lib/prisma'

export const metadata = nycPageMetadata('/','Party Rentals in Riverdale, the Bronx & Lower Westchester | Friendly Party Rental NYC','Rent tents, tables, chairs, inflatables, linens, lighting and wedding equipment from Friendly Party Rental NYC with delivery across Riverdale, selected Bronx neighborhoods and Lower Westchester.')
export const revalidate = 60

export default async function HomePage() {
  const [categoriesResult, popularResult, bounceResult, packagesResult, revisionResult, requestHeaders] = await Promise.all([
    prisma.category.findMany({ select: { slug: true, name: true, picture: true, updatedAt: true, displayToCustomer: true, sortOrder: true } }).catch(() => []),
    getHomepagePopularItems(8).catch(() => []),
    prisma.item.findMany({
      where: { displayToCustomer: true, status: 'Available', category: { slug: 'bounce-house-rentals' } },
      orderBy: { sortOrder: 'asc' },
      take: 12,
      select: { id: true, name: true, specialDisplayName: true, slug: true, cost: true, picture: true, category: { select: { name: true } } },
    }).catch(() => []),
    getSyncedWeddingPackages().catch(() => []),
    prisma.homeRevision.findFirst({ where: { isCurrent: true } }).catch(() => null),
    headers(),
  ])

  const categoryPictures = Object.fromEntries(
    categoriesResult.filter(category => category.picture).map(category => [
      category.slug,
      `/api/category-image/${category.slug}?v=${category.updatedAt ? new Date(category.updatedAt).toISOString() : IMAGE_CACHE_BUST}`,
    ]),
  )
  const known = new Set(PUBLIC_CATEGORIES.map(category => category.slug))
  const extraCategories = categoriesResult
    .filter(category => category.displayToCustomer && !known.has(category.slug))
    .sort((a,b) => a.sortOrder - b.sortOrder)
    .map(category => ({ id: category.slug, name: category.name, slug: category.slug, href: `/category/${category.slug}`, image: categoryPictures[category.slug] || '/images/order-by-date.png', count: 0 }))

  const displayCategories = [...PUBLIC_CATEGORIES, ...extraCategories]
  const categories = displayCategories.map(category => ({
    slug: category.slug,
    name: category.slug === 'bounce-house-rentals' ? 'Bounce Houses & Water Slides' : category.name.replace(' — Riverdale, NY',''),
    href: category.href,
    image: categoryPictures[category.slug] || category.image,
  }))
  const desktopCategories = displayCategories.map(category => ({
    slug: category.slug,
    name: category.name,
    href: category.href,
    image: categoryPictures[category.slug] || category.image,
  }))

  const packages = packagesResult.map(pkg => ({
    id: pkg.id,
    name: pkg.name,
    price: pkg.price,
    guests: pkg.guests,
    image: pkg.image || undefined,
    items: Array.isArray(pkg.items) ? pkg.items as string[] : [],
    popular: pkg.popular,
    signature: 'signature' in pkg ? Boolean(pkg.signature) : false,
  }))

  const popularItems = popularResult.map((item:any) => ({
    id: item.id,
    name: item.specialDisplayName || item.name,
    slug: item.slug,
    cost: item.cost,
    picture: item.picture || (item.slug ? `/api/item-image/${item.slug}?v=${IMAGE_CACHE_BUST}` : null),
    status: null,
    category: item.category,
  }))
  const bounceItems = bounceResult.map((item:any) => ({
    id: item.id,
    name: item.specialDisplayName || item.name,
    slug: item.slug,
    cost: item.cost,
    picture: item.slug ? `/api/item-image/${item.slug}?v=${IMAGE_CACHE_BUST}` : (item.picture || null),
    status: null,
    category: item.category,
  }))

  const revisionHero = revisionResult?.hero as any
  const hero = revisionHero ? {
    mobileImageUrl: revisionHero.mobileImageUrl,
    desktopImageUrl: revisionHero.desktopImageUrl,
    focalX: revisionHero.focalX,
    focalY: revisionHero.focalY,
    desktopFocalX: revisionHero.desktopFocalX,
    desktopFocalY: revisionHero.desktopFocalY,
    primaryActionValue: revisionHero.primaryActionValue,
    secondaryActionValue: revisionHero.secondaryActionValue,
  } : null
  const content = { ...DEFAULT_HOME_CONTENT, ...(revisionResult?.content as Record<string,string> || {}) }

  return <ResponsiveHome
    initialDevice={initialHomeDevice(requestHeaders.get('user-agent'))}
    categories={categories}
    desktopCategories={desktopCategories}
    popularItems={popularItems}
    bounceItems={bounceItems}
    packages={packages}
    weddingImage={packages[0]?.image || null}
    hero={hero}
    content={content}
    seoSection={<NycHomeSeo />}
  />
}
