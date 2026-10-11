// Native NYC package cards use price-free rental photos and current Item.cost.
// This version retires cached Syracuse brochures with baked-in old prices.
export const NYC_WEDDING_IMAGES: Record<string,string> = {
  "pkg-basic": "/api/wedding-art/pkg-basic?v=nyc-package-art-20261011-v1",
  "pkg-standard": "/api/wedding-art/pkg-standard?v=nyc-package-art-20261011-v1",
  "pkg-premium": "/api/wedding-art/pkg-premium?v=nyc-package-art-20261011-v1",
  "pkg-luxury": "/api/wedding-art/pkg-luxury?v=nyc-package-art-20261011-v1",
  "pkg-elite": "/api/wedding-art/pkg-elite?v=nyc-package-art-20261011-v1",
}

export const NYC_WEDDING_ITEM_TO_PACKAGE: Record<string,string> = {
  "wedding-package-backyard-elopement": "pkg-basic",
  "wedding-package-classic-ceremony": "pkg-standard",
  "wedding-package-garden-reception": "pkg-premium",
  "wedding-package-luxury-estate": "pkg-luxury",
  "wedding-package-all-inclusive-premium": "pkg-elite",
}
