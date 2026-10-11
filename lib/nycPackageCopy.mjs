/** Public base models used to price the NYC inflatable bundles. */
export const NYC_PACKAGE_BASE_INFLATABLES = Object.freeze({
  bounceHouse: Object.freeze({ name: 'Rainbow Castle Bounce House', slug: 'crayon-bounce-house', standalonePrice: 340 }),
  waterSlide: Object.freeze({ name: 'Tidal Wave Inflatable Water Slide', slug: 'tidal-wave-inflatable-water-slide', standalonePrice: 425 }),
})

export const NYC_PACKAGE_SERVICE_DISCLOSURE = 'Standard setup and takedown of the included rental equipment are included. Travel/delivery fees and applicable sales tax are additional and calculated separately.'
const CLASSIC_QUOTE_NOTE = 'The linen sizes and basic centerpiece accents are confirmed in your final package quote. Upgraded linens or décor beyond the listed package require a separate quote.'

const PACKAGE_SLUGS = new Set([
  '20x20-tent-package-4-tables-32-chairs',
  'wedding-package-backyard-elopement',
  '20x30-tent-8-tables-64-chairs-package',
  'wedding-package-classic-ceremony',
  '30x30-tent-package-8-tables-80-chairs',
  'wedding-package-garden-reception',
  'linen-tent-package-tent-tables-chairs-tablecloths',
  'wedding-package-luxury-estate',
  'bounce-house-package-4-tables-24-chairs',
  'wedding-package-all-inclusive-premium',
  'bounce-house-water-slide-combo-package',
  'summer-splash-package-waterslide-tables-chairs',
  'kids-birthday-party-package-bounce-house-cotton-candy-tables-chairs',
  'graduation-party-package-small-seats-64',
  'graduation-party-package-large-seats-100',
  'backyard-bbq-party-package-tent-tables-chairs-popcorn-machine',
  'corporate-event-package-tent-tables-chairs-concessions',
])
const BOUNCE_PACKAGES = new Set([
  'bounce-house-package-4-tables-24-chairs',
  'bounce-house-water-slide-combo-package',
  'kids-birthday-party-package-bounce-house-cotton-candy-tables-chairs',
])
const SLIDE_PACKAGES = new Set([
  'bounce-house-water-slide-combo-package',
  'summer-splash-package-waterslide-tables-chairs',
])

/**
 * Apply after NYC location/price localization. Keeps the sale item's existing
 * quantities, exclusions and price text; it does not offer a checkout selector.
 * @param {string} slug
 * @param {string | null | undefined} description
 * @returns {string | null}
 */
export function nycPackageDescription(slug, description) {
  const publicSlug = String(slug || '').replace(/-syracuse(?:-ny)?$/i, '')
  if (!PACKAGE_SLUGS.has(publicSlug)) return description ?? null
  if (typeof description !== 'string' || !description.trim()) return null

  let text = description
    .replace(NYC_PACKAGE_SERVICE_DISCLOSURE, '')
    .replace(CLASSIC_QUOTE_NOTE, '')
    .replace(/\bDelivery,\s*setup,?\s*and pickup included\./gi, '')
    .replace(/,\s*delivered,\s*set up,?\s*and picked up for you/gi, '')
    .replace(/\bTravel\/delivery fees and applicable sales tax are additional(?: and calculated separately)?\./gi, '')
    .replace(/\bEZ pop-up pole tent\b/gi, 'EZ pop-up tent')
  const hasBounce = BOUNCE_PACKAGES.has(publicSlug)
  const hasSlide = SLIDE_PACKAGES.has(publicSlug)

  if (hasBounce || hasSlide) {
    text = text.replace(/\bChoose your favorite (?:bounce house(?: and water slide)?|water slide) styles? when you book[^.]*\.\s*/gi, '')
    if (hasBounce) text = text.replace(/\b(one|1)\s+bounce house\b/gi, '$1 Rainbow Castle Bounce House')
    if (hasSlide) text = text.replace(/\b(one|1)\s+(?:inflatable\s+)?water\s*slide\b/gi, '$1 Tidal Wave Inflatable Water Slide')
    const models = [
      ...(hasBounce ? [NYC_PACKAGE_BASE_INFLATABLES.bounceHouse.name] : []),
      ...(hasSlide ? [NYC_PACKAGE_BASE_INFLATABLES.waterSlide.name] : []),
    ].join(' and ')
    const modelNote = `The listed package price includes the named base ${hasBounce && hasSlide ? 'models' : 'model'} only: ${models}. Other models require a custom quote; any premium-model price difference is confirmed by our team before booking.`
    // A second pass is harmless when an already-localized description is reused.
    text = text.replace(modelNote, '').trim() + '\n\n' + modelNote
  }

  if (publicSlug === 'wedding-package-classic-ceremony') text = text.trim() + '\n\n' + CLASSIC_QUOTE_NOTE

  return text.replace(/\n[\t ]*\n(?:[\t ]*\n)+/g, '\n\n').trim() + '\n\n' + NYC_PACKAGE_SERVICE_DISCLOSURE
}
