import { notFound, permanentRedirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import type { Metadata } from 'next'
import { safeJsonLd } from '@/lib/jsonLd'
import ItemGallery from '@/components/public/ItemGallery'
import SuggestedAddons from '@/components/public/SuggestedAddons'

export const dynamic = 'force-dynamic'

const BASE_URL = 'https://www.friendlypartyrental.com'

function cleanSlug(raw: string) {
  let s = decodeURIComponent(raw)
  s = s.replace(/\/undefined$/i, '')
  s = s.replace(/\([^)]*\)/g, ' ')
  s = s.replace(/[_-]+/g, ' ')
  s = s.replace(/[^a-z0-9 ]/gi, ' ')
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

async function findItem(slugParts: string[]) {
  const rawSlug = (slugParts || []).join('/')
  const lastSegment = rawSlug.split('/').pop() || ''

  try {
    const exact = await prisma.item.findFirst({
      where: { slug: lastSegment },
      include: { category: true },
    })
    if (exact) return exact
  } catch {}

  const cleaned = cleanSlug(rawSlug)
  if (!cleaned) return null
  try {
    const words = cleaned.split(' ').filter((w) => w.length > 2)
    if (words.length === 0) return null
    const match = await prisma.item.findFirst({
      where: {
        AND: words.slice(0, 4).map((w) => ({ name: { contains: w, mode: 'insensitive' as const } })),
      },
      include: { category: true },
    })
    return match
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const item = await findItem((await params).slug)
  if (!item) {
    return { title: 'Friendly Party Rental | Party Rentals in Greenville, SC' }
  }
  const desc = (item.description || `Rent the ${item.name} in Greenville, SC from Friendly Party Rental.`).slice(0, 160)
  const canonical = `${BASE_URL}/items/${item.slug}`
  return {
    title: `${item.name} Rental - Greenville, SC`,
    description: desc,
    alternates: { canonical },
    openGraph: {
      title: `${item.name} Rental`,
      description: desc,
      url: canonical,
      images: item.picture ? [{ url: `${BASE_URL}/api/item-image/${item.slug}?v=${item.updatedAt.getTime()}` }] : undefined,
    },
  }
}

export default async function ItemPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug: slugParts } = await params
  const item = await findItem(slugParts)

  if (!item || !item.category) {
    notFound()
  }

  const lastRequested = (slugParts || []).join('/').split('/').pop() || ''
  if (item.slug !== lastRequested) {
    permanentRedirect(`/items/${item.slug}`)
  }

  const relatedItems = await prisma.item.findMany({
    where: {
      categoryId: item.categoryId,
      id: { not: item.id },
      displayToCustomer: true,
    },
    orderBy: { name: 'asc' },
    take: 4,
  })

const suggestedAddons = item.suggestedAddonIds && item.suggestedAddonIds.length > 0
    ? await prisma.item.findMany({
        where: { id: { in: item.suggestedAddonIds }, displayToCustomer: true },
        select: { id: true, name: true, slug: true, description: true, cost: true, picture: true, quantity: true },
      })
    : []

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: item.name,
    description: item.description || `Rent the ${item.name} in Syracuse, NY from Friendly Party Rental.`,
      image: item.picture ? [`${BASE_URL}/api/item-image/${item.slug}?v=${item.updatedAt.getTime()}`] : undefined,
    category: item.category!.name,
    url: `${BASE_URL}/items/${item.slug}`,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: Number(item.cost).toFixed(2),
      availability: 'https://schema.org/InStock',
      url: `${BASE_URL}/category/${item.category!.slug}`,
      areaServed: 'Syracuse, NY',
    },
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <nav className="text-sm text-gray-500 mb-4">
        <Link href="/">Home</Link>{' / '}
        <Link href={`/category/${item.category!.slug}`}>{item.category!.name}</Link>{' / '}
        <span>{item.name}</span>
      </nav>
      <div className="grid md:grid-cols-2 gap-8 items-start">
        <ItemGallery
          slug={item.slug}
          name={item.name}
          hasPicture={!!item.picture}
          additionalImages={item.additionalImages || []}
        />
        <div>
          <h1 className="text-3xl font-bold mb-4 text-gray-900">{item.name}</h1>
          <p className="text-xl font-semibold mb-4 text-gray-900">Starting at ${Number(item.cost).toFixed(2)}<span className="text-sm font-normal text-gray-500">/day</span></p>
          {item.colorOptions && item.colorOptions.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-1">Available colors:</p>
              <div className="flex flex-wrap gap-2">
                {item.colorOptions.map((c) => (
                  <span key={c} className="text-xs bg-gray-100 border rounded-full px-3 py-1 text-gray-700">{c}</span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">You'll be able to pick your color when you check availability and add it to your order.</p>
            </div>
          )}
          <p className="text-gray-700 mb-6 whitespace-pre-line">{item.description}</p>
          <SuggestedAddons addons={suggestedAddons} />
          {relatedItems.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">You Might Also Like</h2>
              <div className="grid grid-cols-2 gap-2">
                {relatedItems.map((ri) => (
                  <Link key={ri.id} href={`/items/${ri.slug}`} className="block border rounded-lg p-2 text-sm hover:shadow-md transition">
                    <span className="block font-medium text-gray-900">{ri.name}</span>
                    <span className="block text-xs text-gray-500">From ${Number(ri.cost).toFixed(2)}/day</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          <Link
            href={`/category/${item.category!.slug}`}
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            Check Availability & Book
          </Link>
        </div>
      </div>
    </div>
  )
}
