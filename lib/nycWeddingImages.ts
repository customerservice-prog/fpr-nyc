// Approved Minoa-style artwork uses NYC prices, scope and Riverdale details.
// The shared renderer keeps any later catalog price change current.
export const NYC_WEDDING_IMAGES: Record<string,string> = {
  "pkg-basic": "/api/wedding-art/pkg-basic?v=nyc-minoa-package-art-20261011-v3",
  "pkg-standard": "/api/wedding-art/pkg-standard?v=nyc-minoa-package-art-20261011-v3",
  "pkg-premium": "/api/wedding-art/pkg-premium?v=nyc-minoa-package-art-20261011-v3",
  "pkg-luxury": "/api/wedding-art/pkg-luxury?v=nyc-minoa-package-art-20261011-v3",
  "pkg-elite": "/api/wedding-art/pkg-elite?v=nyc-minoa-package-art-20261011-v3",
}

export const NYC_WEDDING_ITEM_TO_PACKAGE: Record<string,string> = {
  "wedding-package-backyard-elopement": "pkg-basic",
  "wedding-package-classic-ceremony": "pkg-standard",
  "wedding-package-garden-reception": "pkg-premium",
  "wedding-package-luxury-estate": "pkg-luxury",
  "wedding-package-all-inclusive-premium": "pkg-elite",
}
