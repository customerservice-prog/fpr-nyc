// These URLs are served by the Greenville app itself.
// The exact bytes are copied from the five public NY package-image endpoints
// during the SC build by scripts/snapshot-ny-wedding-art.mjs.
// Customer/order/payment/business data remain entirely SC-owned.
export const NYC_WEDDING_IMAGES: Record<string,string> = {
  "pkg-basic": "/api/wedding-art/pkg-basic",
  "pkg-standard": "/api/wedding-art/pkg-standard",
  "pkg-premium": "/api/wedding-art/pkg-premium",
  "pkg-luxury": "/api/wedding-art/pkg-luxury",
  "pkg-elite": "/api/wedding-art/pkg-elite",
}

export const NYC_WEDDING_ITEM_TO_PACKAGE: Record<string,string> = {
  "wedding-package-backyard-elopement": "pkg-basic",
  "wedding-package-classic-ceremony": "pkg-standard",
  "wedding-package-garden-reception": "pkg-premium",
  "wedding-package-luxury-estate": "pkg-luxury",
  "wedding-package-all-inclusive-premium": "pkg-elite",
}
