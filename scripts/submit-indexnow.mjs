const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'
const SITE = 'https://www.friendlypartyrentalsc.com'
const HOST = 'www.friendlypartyrentalsc.com'
const KEY = process.env.INDEXNOW_KEY || '280513066d2053b20e0a73c4926f3109'

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
  '/event-planning/wedding-coordination',
  '/event-planning/corporate-events',
  '/event-planning/private-parties',
  '/event-planning/festivals-fundraisers',
  '/design-your-event',
  '/popular-rentals',
  '/service-area',
  '/about_us',
  '/contact_us',
  '/party-rentals-greer-sc',
  '/party-rentals-simpsonville-sc',
  '/party-rentals-mauldin-sc',
  '/party-rentals-taylors-sc',
  '/party-rentals-easley-sc',
  '/party-rentals-travelers-rest-sc',
  '/party-rentals-spartanburg-sc',
  '/party-rentals-anderson-sc',
]

const urlList = [...new Set(paths.map(path => SITE + path))]
const payload = {
  host: HOST,
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
  console.log('[indexnow] submitted', urlList.length, 'priority URLs:', response.status, response.statusText)
  if (body) console.log('[indexnow] response:', body.slice(0, 500))
} catch (error) {
  console.warn('[indexnow] best-effort submission failed:', error instanceof Error ? error.message : String(error))
}
