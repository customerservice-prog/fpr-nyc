import CategoryBrowse from './CategoryBrowse'
import { getPublicCategoryPictures } from '@/lib/publicCatalog'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function CategoryPage() {
  const [pictures, categories] = await Promise.all([
    getPublicCategoryPictures(),
    prisma.category.findMany({
      where: { displayToCustomer: true },
      select: { name: true, slug: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
  ])
  return <CategoryBrowse pictures={pictures} categories={categories} />
}
