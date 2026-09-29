// Primary public address of Friendly Party Rental NYC, for links that leave the
// current page (customer emails, driver QR codes, admin previews). Safe in client
// components: NEXT_PUBLIC_SITE_URL is supplied at build time (see Dockerfile).
export const NYC_PRIMARY_ORIGIN = 'https://friendlypartyrentalnyc.com'

export const NYC_PUBLIC_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL || NYC_PRIMARY_ORIGIN).trim().replace(/\/+$/, '')

/** Host name without scheme, for display text such as email footers. */
export const NYC_PUBLIC_HOST = NYC_PUBLIC_ORIGIN.replace(/^https?:\/\//, '')
