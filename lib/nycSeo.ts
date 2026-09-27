/**
 * NYC SEO configuration and utilities
 * Modeled from scSeo with NYC-specific settings
 */

const NEXT_PUBLIC_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://fpr-nyc-production.up.railway.app';

export const NYC_SITE_URL = NEXT_PUBLIC_SITE_URL;
export const NYC_BUSINESS_ID = 'friendly-party-rental-nyc';
export const NYC_SITE_NAME = 'Friendly Party Rental NYC';

export const NYC_STATIC_SEARCH_PATHS = [
  '/',
  '/about_us',
  '/contact_us',
  '/event-planning',
  '/party-rentals-riverdale-ny',
  '/party-rentals-fieldston-ny',
  '/party-rentals-kingsbridge-ny',
  '/party-rentals-yonkers-ny',
  '/party-rentals-mount-vernon-ny',
  '/party-rentals-new-rochelle-ny',
  '/wedding-vendors',
  '/wedding-packages',
  '/design-your-event',
  '/frequently_asked_questions',
];

export const NYC_NON_SEARCH_PATHS = [
  '/admin',
  '/admin/*',
  '/checkout/*',
  '/pay/*',
  '/order/*',
  '/cart',
  '/account/*',
];

/**
 * Check if a page slug should be searchable
 */
export function isSearchableSlug(slug: string): boolean {
  const publicIndexable = process.env.PUBLIC_INDEXABLE === 'true';
  if (!publicIndexable) return false;

  const normalized = slug.startsWith('/') ? slug : `/${slug}`;
  const isNoIndex = NYC_NON_SEARCH_PATHS.some((path) => {
    const pattern = path.replace(/\*/g, '.*');
    return new RegExp(`^${pattern}$`).test(normalized);
  });

  return !isNoIndex;
}

/**
 * Build full URL from path
 */
export function nycUrl(path: string): string {
  const base = NYC_SITE_URL.replace(/\/$/, '');
  const pathname = path.startsWith('/') ? path : `/${path}`;
  return `${base}${pathname}`;
}

/**
 * Generate meta text for page
 */
export function nycMetaText(title: string, location?: string): string {
  const base = title || NYC_SITE_NAME;
  if (location) return `${base} | ${location}`;
  return base;
}

/**
 * Generate page-level metadata
 */
export interface NycPageMetadataOptions {
  title: string;
  description: string;
  path: string;
  image?: string;
  noindex?: boolean;
}

export function nycPageMetadata(opts: NycPageMetadataOptions) {
  const publicIndexable = process.env.PUBLIC_INDEXABLE === 'true';
  const shouldIndex = publicIndexable && isSearchableSlug(opts.path);

  return {
    title: nycMetaText(opts.title),
    description: opts.description,
    canonical: nycUrl(opts.path),
    robots: {
      index: shouldIndex && !opts.noindex,
      follow: shouldIndex && !opts.noindex,
    },
    openGraph: {
      title: nycMetaText(opts.title),
      description: opts.description,
      url: nycUrl(opts.path),
      siteName: NYC_SITE_NAME,
      images: opts.image
        ? [
            {
              url: nycUrl(opts.image),
              width: 1200,
              height: 630,
            },
          ]
        : undefined,
      type: 'website',
    },
  };
}

/**
 * Generate breadcrumb schema
 */
export interface BreadcrumbItem {
  name: string;
  path: string;
}

export function nycBreadcrumbs(items: BreadcrumbItem[]) {
  const breadcrumbs = [{ name: NYC_SITE_NAME, path: '/' }, ...items];

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: nycUrl(item.path),
    })),
  };
}

/**
 * Check if page is a CMS search page
 */
export function isCmsSearchPage(path: string): boolean {
  return /^\/category\/|^\/items\/|^\/[a-z0-9-]+-rentals-/.test(path);
}

