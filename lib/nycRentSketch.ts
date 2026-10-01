const configuredTenant = String(process.env.NEXT_PUBLIC_NYC_RENTSKETCH_TENANT || '').trim()

// NYC has its own RentSketch tenant. Keep the storefront fail-closed until Railway
// explicitly names that tenant so Syracuse pricing/branding can never leak into NYC.
export const NYC_RENTSKETCH_TENANT: string | null = configuredTenant || null

// Friendly NYC uses the same free planner for shoppers and existing customers.
// Order changes are never automatic; Friendly confirms requested changes separately.
export const nycOrderAccessUrl: string | null = null

export const nycDesignerUrl = (source = 'friendly_nyc') =>
  NYC_RENTSKETCH_TENANT
    ? 'https://rentsketch.com/designer/?tenant=' + encodeURIComponent(NYC_RENTSKETCH_TENANT) + '&source=' + encodeURIComponent(source)
    : '/design-your-event'
