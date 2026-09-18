import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { safeJsonLd } from '@/lib/jsonLd'
import { categoryDescriptionForSc } from '@/lib/scPublicCopy'

const BASE_URL = 'https://www.friendlypartyrentalsc.com'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const category = await prisma.category.findUnique({ where: { slug: (await params).slug } })
    if (!category) return {}
    const localized = categoryDescriptionForSc(category.name, category.description)
    const fallbackDescription = `Rent ${category.name} in Greenville, SC from Friendly Party Rental. Fast online booking, delivery, and setup throughout Upstate South Carolina.`
    const description = localized.length >= 120 ? localized : fallbackDescription
    const canonical = `${BASE_URL}/category/${category.slug}`
    const isLowValueDuplicateIntent = category.slug === 'weddings'
    return {
      title: `${category.name} | Greenville, SC`,
      description,
      alternates: { canonical },
      robots: isLowValueDuplicateIntent ? { index: false, follow: true } : undefined,
      openGraph: {
        title: `${category.name} | Friendly Party Rental Greenville`,
        description,
        url: canonical,
        images: category.picture && !category.picture.startsWith('data:') ? [category.picture] : undefined,
      },
    }
  } catch {
    return {}
  }
}

export default async function CategoryLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  let jsonLd: Record<string, unknown> | null = null
  try {
    const category = await prisma.category.findUnique({ where: { slug: (await params).slug } })
    if (category) {
      jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: category.name,
        description: categoryDescriptionForSc(category.name, category.description),
        url: `${BASE_URL}/category/${category.slug}`,
      }
    }
  } catch {}
  return (
    <>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      )}
      {children}
    </>
  )
}
