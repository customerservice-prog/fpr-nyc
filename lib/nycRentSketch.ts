// Dedicated RentSketch tenant for Friendly Party Rental NYC.
// Prices are intentionally hidden inside RentSketch until its product-price sync
// is wired to the NYC storefront; the NYC checkout remains the pricing authority.
export const NYC_RENTSKETCH_TENANT = 'friendly-nyc'
export const nycOrderAccessUrl =
  'https://rentsketch.com/my-event/?tenant=' + encodeURIComponent(NYC_RENTSKETCH_TENANT) + '&mode=order'

export const nycRentSketchDesignerUrl = (source = 'nyc') =>
  'https://rentsketch.com/designer/?tenant=' + encodeURIComponent(NYC_RENTSKETCH_TENANT) +
  '&source=' + encodeURIComponent(source)
