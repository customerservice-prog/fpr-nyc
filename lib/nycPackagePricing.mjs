// Owner-approved Riverdale package prices (2026-10-11). These are independent of
// Syracuse package prices and must survive every catalog/price sync.
export const NYC_APPROVED_PACKAGE_PRICES = Object.freeze({
  '20x20-tent-package-4-tables-32-chairs': 645,
  'wedding-package-backyard-elopement': 595,
  '20x30-tent-8-tables-64-chairs-package': 1045,
  'wedding-package-classic-ceremony': 995,
  '30x30-tent-package-8-tables-80-chairs': 1495,
  'wedding-package-garden-reception': 3295,
  'linen-tent-package-tent-tables-chairs-tablecloths': 745,
  'wedding-package-luxury-estate': 7495,
  'bounce-house-package-4-tables-24-chairs': 525,
  'wedding-package-all-inclusive-premium': 12995,
  'bounce-house-water-slide-combo-package': 725,
  'summer-splash-package-waterslide-tables-chairs': 595,
  'kids-birthday-party-package-bounce-house-cotton-candy-tables-chairs': 695,
  'graduation-party-package-small-seats-64': 1045,
  'graduation-party-package-large-seats-100': 1595,
  'backyard-bbq-party-package-tent-tables-chairs-popcorn-machine': 725,
  'corporate-event-package-tent-tables-chairs-concessions': 1145,
})

/** Accept the stored source slug and its existing short NYC public URL alias. */
export function approvedNycPackagePrice(slug) {
  const key = typeof slug === 'string' ? slug.trim().replace(/-(?:syracuse|minoa|cny|central-new-york)(?:-ny)?$/i, '') : ''
  return Object.hasOwn(NYC_APPROVED_PACKAGE_PRICES, key) ? NYC_APPROVED_PACKAGE_PRICES[key] : null
}
