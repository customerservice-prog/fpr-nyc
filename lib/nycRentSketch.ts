// Dedicated RentSketch tenant for Friendly Party Rental NYC.
// RentSketch uses the isolated NYC catalog and synced NYC rental prices for planning.
// NYC checkout remains the authority for availability, duration pricing, delivery, tax and deposit.
export const NYC_RENTSKETCH_TENANT = 'friendly-nyc'
export const nycOrderAccessUrl =
  'https://rentsketch.com/my-event/?tenant=' + encodeURIComponent(NYC_RENTSKETCH_TENANT) + '&mode=order'

export const nycRentSketchDesignerUrl = (source = 'nyc') =>
  'https://rentsketch.com/designer/?tenant=' + encodeURIComponent(NYC_RENTSKETCH_TENANT) +
  '&source=' + encodeURIComponent(source)

export type NycRentSketchPreview = {
  source: string
  name?: string
  slug?: string
  productType?: 'tent' | 'inflatable'
  view?: '2d' | '3d'
  parentOrigin?: string
  retry?: number
}

export function nycRentSketchEmbedUrl({ source, name, slug, productType = 'tent', view = '3d', parentOrigin, retry }: NycRentSketchPreview) {
  const params = new URLSearchParams({ tenant: NYC_RENTSKETCH_TENANT, embed: '1', v: '20260920-inflatables-1', source })
  if (parentOrigin) params.set('parentOrigin', parentOrigin)
  if (retry) params.set('retry', String(retry))
  if (name || slug) {
    params.set('view', view)
    params.set('focus', productType)
    params.set('autoplace', '1')
    if (name) params.set(productType === 'inflatable' ? 'product' : 'tent', name)
    if (slug) params.set(productType === 'inflatable' ? 'productSlug' : 'tentSlug', slug)
  }
  return 'https://rentsketch.com/designer/?' + params.toString()
}
