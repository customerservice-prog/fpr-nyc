// Public NYC item URLs.
//
// The NYC catalog mirrors Syracuse item slugs exactly (the catalog sync matches rows by
// slug), but a few Syracuse slugs end in a Syracuse place name, for example
// "graduation-party-package-small-seats-64-syracuse-ny". Customers on the NYC site
// never see that suffix: links, canonical URLs, Open Graph, JSON-LD and the sitemap use
// the slug without it, the item page and the photo route map the short form back to
// the stored slug, and the long form permanently redirects to the short form.

const MARKET_SUFFIX = /-(?:syracuse|minoa|cny|central-new-york)(?:-ny)?$/i
const STORED_SUFFIXES = ['-syracuse-ny', '-syracuse', '-minoa-ny', '-minoa', '-cny', '-central-new-york-ny', '-central-new-york']

/** URL segment the NYC site uses for a stored item slug. */
export function nycItemUrlSlug(slug: string | null | undefined): string {
  const value = typeof slug === 'string' ? slug : ''
  const short = value.replace(MARKET_SUFFIX, '')
  return short.length > 0 ? short : value
}

/** Public NYC path of an item page, e.g. /items/20x20-pole-tent. */
export function nycItemPath(slug: string | null | undefined): string {
  return '/items/' + encodeURIComponent(nycItemUrlSlug(slug))
}

/** NYC photo path of an item (main photo, or additional photo N). */
export function nycItemImagePath(slug: string | null | undefined, index?: number | null): string {
  const base = '/api/item-image/' + encodeURIComponent(nycItemUrlSlug(slug))
  return typeof index === 'number' ? base + '?index=' + index : base
}

/** Stored slugs a public URL segment can refer to, exact slug first. */
export function storedItemSlugCandidates(urlSlug: string): string[] {
  const value = typeof urlSlug === 'string' ? urlSlug : ''
  if (!value) return []
  if (MARKET_SUFFIX.test(value)) return [value]
  return [value, ...STORED_SUFFIXES.map((suffix) => value + suffix)]
}

/** Picks the stored row for a URL segment from rows whose slug is one of the candidates. */
export function pickStoredItem<T extends { slug: string | null }>(urlSlug: string, rows: T[]): T | null {
  for (const candidate of storedItemSlugCandidates(urlSlug)) {
    const row = rows.find((entry) => entry.slug === candidate)
    if (row) return row
  }
  return null
}
