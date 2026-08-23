import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const BASE_URL = 'https://www.friendlypartyrentalsc.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const staticRoutes: MetadataRoute.Sitemap = [
          '',
        '/about_us',
        '/weddings',
        '/wedding-packages',
        '/graduation-rentals',
        '/contact_us',
        '/employment',
        '/frequently_asked_questions',
        '/gallery',
        '/order-by-date',
        '/service-area',
        '/chiavari-chair-rentals',
        '/party-rentals-greer-sc',
        '/party-rentals-simpsonville-sc',
        '/party-rentals-mauldin-sc',
        '/party-rentals-easley-sc',
        '/party-rentals-travelers-rest-sc',
        '/party-rentals-fountain-inn-sc',
        '/party-rentals-taylors-sc',
        '/party-rentals-piedmont-sc',
        '/party-rentals-berea-sc',
        '/party-rentals-anderson-sc',
        '/party-rentals-spartanburg-sc',
        '/party-rentals-duncan-sc',
        '/party-rentals-powdersville-sc',
        '/party-rentals-williamston-sc',
        '/party-rentals-pelzer-sc',
        '/party-rentals-pickens-sc',
        '/party-rentals-liberty-sc',
        '/party-rentals-clemson-sc',
        '/party-rentals-seneca-sc',
        '/party-rentals-laurens-sc',
        '/party-rentals-woodruff-sc',
        '/party-rentals-boiling-springs-sc',
        '/party-rentals-inman-sc',
        '/party-rentals-landrum-sc',
        '/party-rentals-gray-court-sc',
        '/party-rentals-central-sc',
        '/party-rentals-six-mile-sc',
        '/party-rentals-belton-sc',
        '/party-rentals-honea-path-sc',
        '/party-rentals-marietta-sc',
        '/party-rentals-wade-hampton-sc',
        '/party-rentals-judson-sc',
        '/party-rentals-parker-sc',
        '/party-rentals-gantt-sc',
        ].map((route) => ({
              url: `${BASE_URL}${route}`,
              lastModified: new Date(),
              changeFrequency: 'weekly',
              priority: route === '' ? 1 : 0.7,
        }))

  let categoryRoutes: MetadataRoute.Sitemap = []
      try {
            const categories = await prisma.category.findMany({
                    where: { displayToCustomer: true },
                    select: { slug: true, updatedAt: true },
            })
            categoryRoutes = categories.map((c) => ({
                    url: `${BASE_URL}/category/${c.slug}`,
                    lastModified: c.updatedAt,
                    changeFrequency: 'weekly',
                    priority: 0.8,
            }))
      } catch {
            categoryRoutes = []
      }

  let itemRoutes: MetadataRoute.Sitemap = []; try { const items = await prisma.item.findMany({ where: { displayToCustomer: true }, select: { slug: true, updatedAt: true } }); itemRoutes = items.map((it) => ({ url: `${BASE_URL}/items/${it.slug}`, lastModified: it.updatedAt, changeFrequency: 'weekly' as const, priority: 0.6 })) } catch { itemRoutes = [] } return [...staticRoutes, ...categoryRoutes, ...itemRoutes]
}
