import { nycItemUrlSlug } from './nycItemPath'

/** Server pricing uses catalog slugs, never a customer-supplied fee flag. */
export function isNycOneTimePhotoboothUpgrade(slug: string | null | undefined): boolean {
  const canonical = nycItemUrlSlug(slug)
  return canonical === 'photobooth-custom-image-layout-upgrade' || canonical === 'photobooth-custom-backdrop-upgrade'
}

/** Cart entries predating slug hydration can still show the correct price unit. */
export function nycRentalPriceSuffix(item: { slug?: string | null; name?: string | null }): string {
  const slug = nycItemUrlSlug(item.slug)
  const name = String(item.name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  if (isNycOneTimePhotoboothUpgrade(slug) || name === 'photoboothcustomimagelayoutupgrade' || name === 'photoboothcustombackdropupgrade') return ' one-time'
  if (/^photobooth-\d+-hour-(?:with|no)-attendant$/.test(slug) || /^photobooth\d+hour(?:with|no)attendant$/.test(name)) return '/event'
  return '/day'
}
