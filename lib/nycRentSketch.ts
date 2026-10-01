// Dedicated RentSketch tenant for Friendly Party Rental NYC.
// RentSketch uses the isolated NYC catalog and synced NYC rental prices for planning.
// NYC checkout remains the authority for availability, duration pricing, delivery, tax and deposit.
export const NYC_RENTSKETCH_TENANT = 'friendly-nyc'
export const nycOrderAccessUrl =
  'https://rentsketch.com/my-event/?tenant=' + encodeURIComponent(NYC_RENTSKETCH_TENANT) + '&mode=order'

export const nycRentSketchDesignerUrl = (source = 'nyc') =>
  'https://rentsketch.com/designer/?tenant=' + encodeURIComponent(NYC_RENTSKETCH_TENANT) +
  '&source=' + encodeURIComponent(source)
