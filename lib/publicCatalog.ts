import { cache } from 'react'
import { prisma } from '@/lib/prisma'
import { IMAGE_CACHE_BUST } from '@/lib/imageVersion'

/** Request-scoped category image URLs for public server rendering. */
export const getPublicCategoryPictures = cache(async () => {
  const categories = await prisma.category.findMany({
    where: { displayToCustomer: true },
    select: { slug: true, picture: true, updatedAt: true },
  })
  return Object.fromEntries(categories.filter(category => category.picture).map(category => [
    category.slug,
    '/api/category-image/' + encodeURIComponent(category.slug) + '?v=' + encodeURIComponent(category.updatedAt?.toISOString() || IMAGE_CACHE_BUST),
  ]))
})
