import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const BASE_URL = 'https://www.friendlypartyrental.com'

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
        '/party-rentals-cicero-ny',
        '/party-rentals-manlius-ny',
        '/party-rentals-camillus-ny',
        '/party-rentals-clay-ny',
        '/party-rentals-baldwinsville-ny',
        '/party-rentals-liverpool-ny',
        '/party-rentals-minoa-ny',
        '/party-rentals-east-syracuse-ny',
        '/party-rentals-dewitt-ny',
        '/party-rentals-fayetteville-ny',
        '/party-rentals-chittenango-ny',
        '/party-rentals-salina-ny',
        '/party-rentals-north-syracuse-ny',
        '/party-rentals-cazenovia-ny',
        '/party-rentals-canastota-ny',
        '/party-rentals-oneida-ny',
        '/party-rentals-bridgeport-ny',
        '/party-rentals-skaneateles-ny',
        '/party-rentals-kirkville-ny',
        '/party-rentals-lyncourt-ny',
        '/party-rentals-auburn-ny',
        '/party-rentals-marcellus-ny',
        '/party-rentals-lafayette-ny',
        '/party-rentals-tully-ny',
        '/party-rentals-jamesville-ny',
        '/party-rentals-nedrow-ny',
        '/party-rentals-onondaga-hill-ny',
        '/party-rentals-westvale-ny',
        '/party-rentals-oswego-ny',
        '/party-rentals-fulton-ny',
        '/party-rentals-phoenix-ny',
        '/party-rentals-brewerton-ny',
        '/party-rentals-central-square-ny',
        '/party-rentals-lacona-ny',
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
