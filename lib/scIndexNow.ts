import { prisma } from '@/lib/prisma'
import { SC_LOCAL_PLANNING } from '@/lib/scLocalPlanningResources'
import { SC_SERVICE_AREAS } from '@/lib/scServiceAreas'
import { SC_STATIC_SEARCH_PATHS, isCmsSearchPage, isSearchableSlug, scUrl } from '@/lib/scSeo'

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'
const INDEXNOW_HOST = 'www.friendlypartyrentalsc.com'
const FALLBACK_KEY = '280513066d2053b20e0a73c4926f3109'

export async function currentSearchableScUrls(): Promise<string[]> {
  const [categories, items, pages] = await Promise.all([
    prisma.category.findMany({ where: { displayToCustomer: true }, select: { slug: true } }),
    prisma.item.findMany({ where: { displayToCustomer: true, category: { displayToCustomer: true } }, select: { slug: true } }),
    prisma.websitePage.findMany({ where: { isPublished: true }, select: { slug: true, content: true, isPublished: true } }),
  ])

  const urls = new Set<string>()
  const add = (path: string) => urls.add(scUrl(path))

  SC_STATIC_SEARCH_PATHS.forEach(add)
  SC_SERVICE_AREAS.filter(area => area.href !== '/' && SC_LOCAL_PLANNING[area.slug]).forEach(area => add(area.href))
  categories.filter(category => isSearchableSlug(category.slug) && category.slug !== 'weddings').forEach(category => add('/category/' + encodeURIComponent(category.slug)))
  items.filter(item => isSearchableSlug(item.slug)).forEach(item => add('/items/' + encodeURIComponent(item.slug!)))
  pages.filter(isCmsSearchPage).forEach(page => add('/' + encodeURIComponent(page.slug)))

  return [...urls]
}

export async function submitScIndexNow(urlList: string[]) {
  const key = process.env.INDEXNOW_KEY || FALLBACK_KEY
  const uniqueUrls = [...new Set(urlList)].filter(url => url.startsWith('https://www.friendlypartyrentalsc.com/')).slice(0, 10000)
  if (!uniqueUrls.length) return { submitted: 0, status: 204, ok: true, body: '' }

  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: INDEXNOW_HOST,
      key,
      keyLocation: 'https://www.friendlypartyrentalsc.com/' + key + '.txt',
      urlList: uniqueUrls,
    }),
    signal: AbortSignal.timeout(15000),
  })
  const body = await response.text().catch(() => '')
  return { submitted: uniqueUrls.length, status: response.status, ok: response.ok, body: body.slice(0, 500) }
}
