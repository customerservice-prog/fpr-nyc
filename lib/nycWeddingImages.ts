// These URLs are served by the NYC app itself.
// The build makes a best-effort snapshot of the five public NY package-image
// endpoints for visual parity. If a snapshot is unavailable, the image route
// falls back to the NYC package image stored in this location's database.
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
