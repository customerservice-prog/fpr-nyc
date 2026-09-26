// SECURITY: Greenville customer RentSketch access is deliberately disabled.
//
// Do not enable this with an environment variable alone. The RentSketch tenant
// must first have a server-enforced customer access policy that requires either
// a verified eligible Greenville order or a verified paid Event Pass.
//
// NY's tenant slug ("friendly") must never be reused here. Until Greenville has
// its own server-side order-or-paid entitlement integration, every SC CTA stays
// on the local contact/layout-help path and no RentSketch designer URL is emitted.
export const SC_RENTSKETCH_TENANT: string | null = null
export const scOrderAccessUrl: string | null = null
