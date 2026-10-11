import { notFound, permanentRedirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import type { Metadata } from 'next'
import {nycPageMetadata,nycMetaText,nycBreadcrumbs,NYC_BUSINESS_ID,nycUrl,NYC_SITE_URL} from '@/lib/nycSeo'
import LocalDeliveryLinks from '@/components/public/LocalDeliveryLinks'
import { safeJsonLd } from '@/lib/jsonLd'
import ItemGallery from '@/components/public/ItemGallery'
import SuggestedAddons from '@/components/public/SuggestedAddons'
import DesignYourEventCTA from '@/components/public/DesignYourEventCTA'
import { isActualTentItem } from '@/lib/nycRentSketch'
import { getSmartAddonSearchTerms, isSmartAddonCompatible, rankSmartAddons, supportsSmartAddons } from '@/lib/smartAddons'
import { itemDescriptionForNyc } from '@/lib/nycPublicCopy'
import { nycItemImagePath, nycItemPath, nycItemUrlSlug, pickStoredItem, storedItemSlugCandidates } from '@/lib/nycItemPath'
import { NYC_SERVICE_AREAS } from '@/lib/nycServiceAreas'
import { isNycOneTimePhotoboothUpgrade, nycRentalPriceSuffix } from '@/lib/nycRentalPricing'

export const dynamic = 'force-dynamic'
// Canonical/Open Graph/JSON-LD origin: the NYC primary domain from NEXT_PUBLIC_SITE_URL.
const BASE_URL = NYC_SITE_URL

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
    // Exact stored slug first, then the stored slug behind a short NYC URL (lib/nycItemPath).
    const candidates = storedItemSlugCandidates(safeSegment)
    const rows = candidates.length ? await prisma.item.findMany({ where: { slug: { in: candidates }, displayToCustomer: true, category: {displayToCustomer:true} }, include: { category: true } }) : []
    const exact = pickStoredItem(safeSegment, rows)
    if (exact) return exact
  } catch {}
  const cleaned = cleanSlug(rawSlug)
  if (!cleaned) return null
  try {
    const words = cleaned.split(' ').filter((w) => w.length > 2)
    if (!words.length) return null
    return await prisma.item.findFirst({
      where: { displayToCustomer:true, category:{displayToCustomer:true}, AND: words.slice(0, 4).map((w) => ({ name: { contains: w, mode: 'insensitive' as const } })) },
      include: { category: true },
    })
  } catch { return null }
}

// Public URL segment for an item: the slug without a Syracuse place suffix, unless
// another stored item already uses that short slug (then the full slug stays public).
async function publicSegment(item: { id: string; slug: string | null }): Promise<string> {
  const stored = item.slug || ''
  const short = nycItemUrlSlug(stored)
  if (short === stored) return stored
  try {
    const clash = await prisma.item.findFirst({ where: { slug: short, id: { not: item.id } }, select: { id: true } })
    return clash ? stored : short
  } catch {
    return stored
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const item = await findItem((await params).slug)
  if (!item) return { title: 'Rental not found', robots:{index:false,follow:true} }
  const fullDescription = itemDescriptionForNyc(item.name, item.description, Number(item.cost))
  const desc = nycMetaText(`Rent ${item.name} in Riverdale, NY. ${fullDescription}`)
  const segment = await publicSegment(item)
  const path = '/items/' + encodeURIComponent(segment)
  const canonical = `${BASE_URL}${path}`
  return {
    ...nycPageMetadata(path, `${item.name} Rental - Riverdale, NY`, desc),
    description: desc,
    alternates: { canonical },
    openGraph: {
      title: `${item.name} Rental in Riverdale, NY`,
      description: desc,
      url: canonical,
      images: item.picture ? [{ url: `${BASE_URL}/api/item-image/${encodeURIComponent(segment)}?v=${item.updatedAt.getTime()}` }] : undefined,
    },
  }
}

export default async function ItemPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug: slugParts } = await params
  const item = await findItem(slugParts)
  if (!item || !item.category) notFound()
  const segment = await publicSegment(item)
  const itemPath = '/items/' + encodeURIComponent(segment)
  const imagePath = '/api/item-image/' + encodeURIComponent(segment)
  if (segment !== (slugParts || []).join('/')) permanentRedirect(itemPath)

  const description = itemDescriptionForNyc(item.name, item.description, Number(item.cost))
  const smartSource = { id: item.id, name: item.name, slug: segment, category: item.category }
  const smartAddonTerms = getSmartAddonSearchTerms(smartSource)
  const smartEnabled = supportsSmartAddons(smartSource)
  const addonSelect = { id: true, name: true, slug: true, description: true, cost: true, picture: true, quantity: true, type: true, colorOptions: true, category: { select: { name: true, slug: true, pricingProfile: true } } } as const
  const [relatedItems, explicitAddons, smartCandidates] = await Promise.all([
    smartEnabled || item.suggestedAddonIds.length > 0 ? Promise.resolve([]) : prisma.item.findMany({
      where: { categoryId: item.categoryId, id: { not: item.id }, displayToCustomer: true },
      orderBy: { name: 'asc' }, take: 4,
    }),
    item.suggestedAddonIds.length > 0 ? prisma.item.findMany({
      where: { id: { in: item.suggestedAddonIds }, displayToCustomer: true, category: { displayToCustomer: true } },
      select: addonSelect,
    }) : Promise.resolve([]),
    smartAddonTerms.length > 0 ? prisma.item.findMany({
      where: {
        id: { not: item.id }, displayToCustomer: true, status: 'Available', quantity: { gt: 0 }, type: 'Regular',
        category: { displayToCustomer: true },
        OR: smartAddonTerms.map(term => ({ name: { contains: term, mode: 'insensitive' as const } })),
      },
      orderBy: { name: 'asc' }, take: 80, select: addonSelect,
    }) : Promise.resolve([]),
  ])
  const validSlug = (addon: { slug: string | null }) => typeof addon.slug === 'string' && !!addon.slug.trim() && !/^(?:null|undefined)$/i.test(addon.slug)
  const validRelatedItems = relatedItems.filter(validSlug)
  const explicitById = new Map(explicitAddons.filter(validSlug).map(addon => [addon.id, addon]))
  const pinnedAddons = item.suggestedAddonIds
    .map(id => explicitById.get(id))
    .filter((addon): addon is (typeof explicitAddons)[number] => Boolean(addon))
    .filter(addon => isSmartAddonCompatible(smartSource, addon))
  const pinnedIds = new Set(pinnedAddons.map(addon => addon.id))
  const eligibleSmartCandidates = smartCandidates.filter(addon => validSlug(addon) && !pinnedIds.has(addon.id) && !/\b(fee|replacement|extra hour|delivery|travel)\b/i.test(addon.name))
  const smartAddons = rankSmartAddons(smartSource, eligibleSmartCandidates, Math.max(0, 4 - pinnedAddons.length))
  const recommendedAddons = (item.category.slug === 'photobooth-rentals'
    ? [...pinnedAddons, ...smartAddons].filter(addon => nycItemUrlSlug(addon.slug) === 'photobooth-custom-image-layout-upgrade' || (/with attendant/i.test(item.name) && nycItemUrlSlug(addon.slug) === 'photobooth-custom-backdrop-upgrade'))
    : [...pinnedAddons, ...smartAddons]).slice(0, 4)
  const isPhotoBoothUpgrade = isNycOneTimePhotoboothUpgrade
  // Main-site recommendation rules, rendered only from NYC catalog prices and photos.
  const validSuggestedAddons = recommendedAddons.map(addon => ({
    ...addon,
    description: itemDescriptionForNyc(addon.name, addon.description, Number(addon.cost)),
    picture: addon.picture ? nycItemImagePath(addon.slug) : null,
    categorySlug: addon.category.slug,
    pricingProfile: addon.category.pricingProfile,
    colorOptions: addon.colorOptions,
    isPackage: addon.type === 'Package',
    oneTimeFee: isPhotoBoothUpgrade(addon.slug),
  }))
  const showPremiumAddons = validSuggestedAddons.length > 0 && smartEnabled
  const isOneTimeUpgrade = isPhotoBoothUpgrade(segment)
  const includedCopy = `${item.name} ${description}`
  const knownIncludedItems = /20\s*(?:x|×)\s*30/i.test(includedCopy) && /\b8\s*tables\b/i.test(includedCopy) && /\b64\s*chairs\b/i.test(includedCopy)
    ? ['20x30 tent', '8 tables', '64 chairs']
    : item.category.slug === 'photobooth-rentals' && /^photobooth-\d+-hour-(?:with|no)-attendant$/.test(segment)
      ? ['4x6 prints included', 'Photo props', 'Standard backdrop', 'Digital gallery'] : []

  const isStandaloneTent = isActualTentItem(item.name)
  const isInflatable = item.category.slug === 'bounce-house-rentals' && !/\b(package|blower|sandbag|extension cord|accessor)\b/i.test(item.name)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: item.name,
    description,
    image: item.picture ? [`${BASE_URL}${imagePath}?v=${item.updatedAt.getTime()}`] : undefined,
    category: item.category.name,
    url: `${BASE_URL}${itemPath}`,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: Number(item.cost).toFixed(2),
      businessFunction: 'http://purl.org/goodrelations/v1#LeaseOut',
      seller: {'@id':NYC_BUSINESS_ID},
      url: nycUrl(itemPath),
      areaServed: NYC_SERVICE_AREAS.map((area) => ({ '@type': 'Place', name: area.name + ', NY' })),
    },
  }

  return (
    <div className={`${showPremiumAddons ? 'max-w-7xl' : 'max-w-4xl'} mx-auto px-4 py-10`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(nycBreadcrumbs([{name:"Home",path:"/"},{name:item.category.name,path:`/category/${item.category.slug}`},{name:item.name,path:itemPath}]))}}/>
      <nav className={`${showPremiumAddons ? 'mx-auto max-w-4xl ' : ''}mb-4 text-sm text-gray-500`}><Link href="/">Home</Link>{' / '}<Link href={`/category/${item.category.slug}`}>{item.category.name}</Link>{' / '}<span>{item.name}</span></nav>
      <div className={`${showPremiumAddons ? 'mx-auto max-w-4xl ' : ''}grid items-start gap-8 md:grid-cols-2`}>
        <ItemGallery slug={segment} name={item.name} hasPicture={!!item.picture} additionalImageCount={(item.additionalImages || []).length} version={String(item.updatedAt.getTime())} />
        <div>
          <h1 className="text-3xl font-bold mb-4 text-gray-900">{item.name}</h1>
          <p className="text-xl font-semibold mb-4 text-gray-900">Starting at ${Number(item.cost).toFixed(2)}<span className="text-sm font-normal text-gray-500">{isOneTimeUpgrade ? ' one-time upgrade fee' : nycRentalPriceSuffix(item)}</span></p>
          {nycRentalPriceSuffix(item) === '/event' && <p className="mb-4 text-sm text-gray-600">The rate covers the hours listed above. Additional rental days, delivery and sales tax are calculated at checkout.</p>}
          {isStandaloneTent && (
            <figure className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
              <div className="bg-white p-3">
                <img
                  src={`${imagePath}?v=${item.updatedAt.getTime()}`}
                  alt={item.name + ' rental tent preview'}
                  width={760}
                  height={520}
                  loading="lazy"
                  className="mx-auto max-h-72 w-full object-contain"
                />
              </div>
              <figcaption className="border-t border-slate-200 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">See what the {item.name} looks like.</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">This is the rental photo for this tent listing. Full event layouts belong in Design Your Event after you choose to plan an event; this product page stays focused on the tent itself.</p>
              </figcaption>
            </figure>
          )}
          {item.colorOptions && item.colorOptions.length > 0 && <div className="mb-4"><p className="text-sm font-medium text-gray-700 mb-1">Available colors:</p><div className="flex flex-wrap gap-2">{item.colorOptions.map((c) => <span key={c} className="text-xs bg-gray-100 border rounded-full px-3 py-1 text-gray-700">{c}</span>)}</div><p className="text-xs text-gray-500 mt-1">Choose your color while checking availability and adding the item to your order.</p></div>}
          <p className="text-gray-700 mb-6 whitespace-pre-line leading-7">{description}</p>
          {(isStandaloneTent || isInflatable) && <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-5"><p className="mb-3 text-sm font-bold text-blue-950">{isInflatable ? 'See this inflatable in your event layout' : 'See this tent in your event layout'}</p><p className="mb-4 text-sm leading-6 text-slate-600">Open the NYC RentSketch planner with this rental as your starting point, then add tables, chairs and other equipment around it. Availability and final setup requirements are confirmed separately.</p><DesignYourEventCTA source="item_page_visual_planner" label={isInflatable ? 'See This Inflatable in a Layout' : 'See This Tent in a Layout'} tent={item.name} tentSlug={segment} productType={isInflatable ? 'inflatable' : 'tent'} /></div>}
          {!showPremiumAddons && <SuggestedAddons addons={validSuggestedAddons} />}
          {!showPremiumAddons && validRelatedItems.length > 0 && <div className="mb-6"><h2 className="text-sm font-semibold text-gray-700 mb-2">You Might Also Like</h2><div className="grid grid-cols-2 gap-2">{validRelatedItems.map((ri) => <Link key={ri.id} href={nycItemPath(ri.slug!)} prefetch={false} className="block border rounded-lg p-2 text-sm hover:shadow-md transition"><span className="block font-medium text-gray-900">{ri.name}</span><span className="block text-xs text-gray-500">From ${Number(ri.cost).toFixed(2)}{nycRentalPriceSuffix(ri)}</span></Link>)}</div></div>}
          <Link href={`/category/${item.category.slug}`} className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700">Check Availability & Book</Link>
        </div>
      </div>
      {showPremiumAddons && <SuggestedAddons addons={validSuggestedAddons} contextName={item.name} variant="premium" includedItems={knownIncludedItems} />}
      <LocalDeliveryLinks/>
    </div>
  )
}
