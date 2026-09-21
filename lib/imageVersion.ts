// Bump this value whenever previously-cached (even browser "immutable"-tagged)
// item/category/wedding-package photos need to be forced fresh in every visitor's
// browser. Appending it as a `?v=` query param on image URLs changes the URL itself,
// which is the only way to bypass a copy a browser already cached as immutable.
export const IMAGE_CACHE_BUST = '20260921-media-email-2'
