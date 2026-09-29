// Single source of truth for the Friendly Party Rental NYC logo.
// The file is the exact approved artwork (Bronx, Riverdale NY), byte-for-byte:
// 1774x887 PNG (2:1), sha256 806f9d15f32e34154eb0b8556433ef3ab20e94f707f7019fcddafecbf748f83f.
// Always render it whole: keep the 2:1 ratio, never crop, stretch or swap in a derivative.
// Keep public/site.webmanifest, public/driver-manifest.webmanifest and the legacy
// logo redirects in next.config.js pointed at this same path.
export const NYC_LOGO_PATH = '/brand/friendly-party-rental-nyc-logo-v8.png'
export const NYC_LOGO_WIDTH = 1774
export const NYC_LOGO_HEIGHT = 887
export const NYC_LOGO_ALT = 'Friendly Party Rental NYC'
// Email clients need an absolute URL on a host that resolves today.
export const NYC_EMAIL_LOGO_URL = 'https://fpr-nyc-production.up.railway.app' + NYC_LOGO_PATH
