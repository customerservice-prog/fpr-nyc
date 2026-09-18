import { notFound, permanentRedirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import type { Metadata } from 'next'
import { safeJsonLd } from '@/lib/jsonLd'
import ItemGallery from '@/components/public/ItemGallery'
import SuggestedAddons from '@/components/public/SuggestedAddons'
import DesignYourEventCTA from '@/components/public/DesignYourEventCTA'
import { itemDescriptionForSc } from '@/lib/scPublicCopy'

export const dynamic = 'force-dynamic'
const BASE_URL = 'https://www.friendlypartyrentalsc.com'

function cleanSlug(raw: string) {
  let s = decodeURIComponent(raw)
  s = s.replace(/\/undefined$/i, '')
  s = s.replace(/\([^)]*\)/g, ' ')
  s = s.replace(/[_-]+/g, ' ')
  s = s.replace(/[^a-z0-9 ]/gi, ' ')
  return s.replace(/\s+/g, ' ').trim()
}

async function findItem(slugParts: string[]) {
  const rawSlug = (slugParts || []).join('/')
  const lastSegment = rawSlug.split('/').pop() || ''
  const safeSegment = lastSegment.replace(/[\u0000-\u001F\u007F]/g, '')
  try {
    const exact = await prisma.item.findFirst({ where: { slug: safeSegment }, include: { category: true } })
    if (exact) return exact
  } catch {}
  const cleaned = cleanSlug(rawSlug)
  if (!cleaned) return null
  try {
    const words = cleaned.split(' ').filter((w) => w.length > 2)
    if (!words.length) return null
    return await prisma.item.findFirst({
      where: { AND: words.slice(0, 4).map((w) => ({ name: { contains: w, mode: 'insensitive' as const } })) },
      include: { category: true },
    })
  } catch { return null }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const item = await findItem((await params).slug)
  if (!item) return { title: 'Friendly Party Rental | Party Rentals in Greenville, SC' }
  const fullDescription = itemDescriptionForSc(item.name, item.description)
  const desc = fullDescription.slice(0, 160)
  const canonical = `${BASE_URL}/items/${item.slug}`
  return {
    title: `${item.name} Rental - Greenville, SC`,
    description: desc,
    alternates: { canonical },
    openGraph: {
      title: `${item.name} Rental in Greenville, SC`,
      description: desc,
      url: canonical,
      images: item.picture ? [{ url: `${BASE_URL}/api/item-image/${item.slug}?v=${item.updatedAt.getTime()}` }] : undefined,
    },
  }
}

export default async function ItemPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug: slugParts } = await params
  const item = await findItem(slugParts)
  if (!item || !item.category) notFound()
  const lastRequested = (slugParts || []).join('/').split('/').pop() || ''
  if (item.slug !== lastRequested) permanentRedirect(`/items/${item.slug}`)

  const description = itemDescriptionForSc(item.name, item.description)
  const relatedItems = await prisma.item.findMany({ where: { categoryId: item.categoryId, id: { not: item.id }, displayToCustomer: true }, orderBy: { name: 'asc' }, take: 4 })
  const validRelatedItems = relatedItems.filter((ri) => { const slug = typeof ri.slug === 'string' ? ri.slug.trim() : ''; return slug.length > 0 && slug.toLowerCase() !== 'null' && slug.toLowerCase() !== 'undefined' })
  const suggestedAddons = item.suggestedAddonIds && item.suggestedAddonIds.length > 0 ? await prisma.item.findMany({ where: { id: { in: item.suggestedAddonIds }, displayToCustomer: true }, select: { id: true, name: true, slug: true, description: true, cost: true, picture: true, quantity: true } }) : []
  const validSuggestedAddons = suggestedAddons.filter((addon) => { const slug = typeof addon.slug === 'string' ? addon.slug.trim() : ''; return slug.length > 0 && slug.toLowerCase() !== 'null' && slug.toLowerCase() !== 'undefined' })

  const isStandaloneTent = /\btent\b/i.test(item.name) && /\b\d+\s*(?:x|×)\s*\d+\b/i.test(item.name) && !/(?:side\s*wall|sidewall|package|accessor)/i.test(item.name)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: item.name,
    description,
    image: item.picture ? [`${BASE_URL}/api/item-image/${item.slug}?v=${item.updatedAt.getTime()}`] : undefined,
    category: item.category.name,
    url: `${BASE_URL}/items/${item.slug}`,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: Number(item.cost).toFixed(2),
      availability: 'https://schema.org/InStock',
      url: `${BASE_URL}/category/${item.category.slug}`,
      areaServed: 'Greenville, SC',
    },
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <nav className="text-sm text-gray-500 mb-4"><Link href="/">Home</Link>{' / '}<Link href={`/category/${item.category.slug}`}>{item.category.name}</Link>{' / '}<span>{item.name}</span></nav>
      <div className="grid md:grid-cols-2 gap-8 items-start">
        <ItemGallery slug={item.slug} name={item.name} hasPicture={!!item.picture} additionalImages={item.additionalImages || []} />
        <div>
          <h1 className="text-3xl font-bold mb-4 text-gray-900">{item.name}</h1>
          <p className="text-xl font-semibold mb-4 text-gray-900">Starting at ${Number(item.cost).toFixed(2)}<span className="text-sm font-normal text-gray-500">/day</span></p>
          {isStandaloneTent && (
            <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="font-bold text-emerald-950 mb-1">See this exact tent in RentSketch 3D</p>
              <p className="mb-3 text-sm text-emerald-950/80">Preview the {item.name} by itself, then add tables, chairs, dance floor pieces and other equipment to build your event layout.</p>
              <DesignYourEventCTA source="tent_product_page" label="See This Tent in a Layout" variant="primary" tent={item.name} tentSlug={item.slug} className="w-full sm:w-auto" />
            </div>
          )}
          {item.colorOptions && item.colorOptions.length > 0 && <div className="mb-4"><p className="text-sm font-medium text-gray-700 mb-1">Available colors:</p><div className="flex flex-wrap gap-2">{item.colorOptions.map((c) => <span key={c} className="text-xs bg-gray-100 border rounded-full px-3 py-1 text-gray-700">{c}</span>)}</div><p className="text-xs text-gray-500 mt-1">Choose your color while checking availability and adding the item to your order.</p></div>}
          <p className="text-gray-700 mb-6 whitespace-pre-line leading-7">{description}</p>
          <SuggestedAddons addons={validSuggestedAddons} />
          {validRelatedItems.length > 0 && <div className="mb-6"><h2 className="text-sm font-semibold text-gray-700 mb-2">You Might Also Like</h2><div className="grid grid-cols-2 gap-2">{validRelatedItems.map((ri) => <Link key={ri.id} href={`/items/${ri.slug}`} prefetch={false} className="block border rounded-lg p-2 text-sm hover:shadow-md transition"><span className="block font-medium text-gray-900">{ri.name}</span><span className="block text-xs text-gray-500">From ${Number(ri.cost).toFixed(2)}/day</span></Link>)}</div></div>}
          <Link href={`/category/${item.category.slug}`} className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700">Check Availability & Book</Link>
        </div>
      </div>
    </div>
  )
}
