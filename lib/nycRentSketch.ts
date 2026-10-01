// Friendly Party Rental NYC has its own RentSketch tenant and booking-access path.
// These are public identifiers/URLs; no secret is exposed to the browser.
export const NYC_RENTSKETCH_TENANT = 'friendly-nyc'
export const nycOrderAccessUrl = 'https://rentsketch.com/my-event/?tenant=friendly-nyc&mode=order'
export const nycRentSketchDesignerUrl = (source = 'nyc') =>
  'https://rentsketch.com/designer/?tenant=' + encodeURIComponent(NYC_RENTSKETCH_TENANT) + '&source=' + encodeURIComponent(source)
