const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '')
const KEY = (process.env.INDEXNOW_KEY || '').trim()
const indexable = process.env.PUBLIC_INDEXABLE === 'true'

if (!indexable || !/^https:\/\//.test(SITE) || !KEY) {
  console.log('[indexnow] skipped: NYC public indexing is disabled or IndexNow is not configured')
  process.exit(0)
}

const host = new URL(SITE).hostname
const paths = [
  '/',
  '/category',
  '/category/tent-rentals',
  '/category/table-chair-rentals',
  '/category/bounce-house-rentals',
  '/category/linen-rentals',
  '/category/dance-floor-stage-rentals',
  '/category/event-lighting-rentals',
  '/category/generator-rentals',
  '/category/party-rental-packages',
  '/weddings',
  '/chiavari-chair-rentals',
  '/graduation-rentals',
  '/event-planning',
  '/design-your-event',
  '/popular-rentals',
  '/service-area',
  '/about_us',
  '/contact_us',
  '/party-rentals-riverdale-ny',
  '/party-rentals-fieldston-ny',
  '/party-rentals-kingsbridge-ny',
  '/party-rentals-bronx-ny',
  '/party-rentals-yonkers-ny',
  '/party-rentals-mount-vernon-ny',
  '/party-rentals-new-rochelle-ny',
  '/party-rentals-bronxville-ny',
  '/party-rentals-tuckahoe-ny',
  '/party-rentals-eastchester-ny',
  '/party-rentals-pelham-ny',
]

const urlList = [...new Set(paths.map((path) => SITE + path))]
const payload = {
  host,
  key: KEY,
  keyLocation: SITE + '/' + KEY + '.txt',
  urlList,
}

try {
  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  })
  const body = await response.text().catch(() => '')
  console.log('[indexnow] submitted', urlList.length, 'NYC priority URLs:', response.status, response.statusText)
  if (body) console.log('[indexnow] response:', body.slice(0, 500))
} catch (error) {
  console.warn('[indexnow] best-effort submission failed:', error instanceof Error ? error.message : String(error))
}
