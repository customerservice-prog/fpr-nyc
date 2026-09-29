import type { Metadata } from 'next'
import { Roboto } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import Script from 'next/script'
import { CartProvider } from '@/components/public/CartContext'
import { GOOGLE_TAG_ID, GOOGLE_TAG_BOOTSTRAP } from '@/lib/gtag'
import GoogleAnalyticsListener from '@/components/GoogleAnalyticsListener'
import VisitorTracker from '@/components/VisitorTracker'
import './globals.css'
import { safeJsonLd } from '@/lib/jsonLd'
import { BUSINESS } from '@/lib/utils'
import { NYC_SERVICE_AREAS } from '@/lib/nycServiceAreas'
import { NYC_LOGO_PATH, NYC_LOGO_WIDTH, NYC_LOGO_HEIGHT } from '@/lib/nycBrand'

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
})

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://fpr-nyc-production.up.railway.app').replace(/\/$/, '')
const INDEXABLE = process.env.PUBLIC_INDEXABLE === 'true'
const SITE_DESCRIPTION =
  'Friendly Party Rental NYC provides party and event rentals in Riverdale, selected Bronx neighborhoods, Yonkers, Mount Vernon, New Rochelle and nearby Lower Westchester communities.'

const LOCAL_BUSINESS_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': SITE_URL + '/#business',
  name: BUSINESS.name,
  legalName: BUSINESS.legalName,
  description: SITE_DESCRIPTION,
  image: SITE_URL + NYC_LOGO_PATH,
  logo: SITE_URL + NYC_LOGO_PATH,
  telephone: '+1-' + BUSINESS.phone,
  email: BUSINESS.email,
  url: SITE_URL,
  openingHoursSpecification: [{
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
    opens: '09:00',
    closes: '18:00',
  }],
  areaServed: NYC_SERVICE_AREAS.map((area) => ({
    '@type': 'Place',
    name: area.name + ', NY',
  })),
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Party and event rentals in Riverdale, the Bronx and Lower Westchester',
    itemListElement: [
      { '@type': 'OfferCatalog', name: 'Tent Rentals', url: SITE_URL + '/category/tent-rentals' },
      { '@type': 'OfferCatalog', name: 'Table & Chair Rentals', url: SITE_URL + '/category/table-chair-rentals' },
      { '@type': 'OfferCatalog', name: 'Bounce House & Water Slide Rentals', url: SITE_URL + '/category/bounce-house-rentals' },
      { '@type': 'OfferCatalog', name: 'Wedding Rentals', url: SITE_URL + '/weddings' },
      { '@type': 'OfferCatalog', name: 'Linen Rentals', url: SITE_URL + '/category/linen-rentals' },
      { '@type': 'OfferCatalog', name: 'Dance Floor & Stage Rentals', url: SITE_URL + '/category/dance-floor-stage-rentals' },
    ],
  },
  priceRange: '$$',
}

const WEBSITE_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': SITE_URL + '/#website',
  url: SITE_URL,
  name: BUSINESS.name,
  description: SITE_DESCRIPTION,
  publisher: { '@id': SITE_URL + '/#business' },
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: BUSINESS.name,
  manifest: '/site.webmanifest',
  // Browser tab, bookmark and home-screen icons use the exact full logo (no cropped icon).
  icons: {
    icon: [{ url: NYC_LOGO_PATH, sizes: `${NYC_LOGO_WIDTH}x${NYC_LOGO_HEIGHT}`, type: 'image/png' }],
    shortcut: NYC_LOGO_PATH,
    apple: [{ url: NYC_LOGO_PATH, sizes: `${NYC_LOGO_WIDTH}x${NYC_LOGO_HEIGHT}`, type: 'image/png' }],
  },
  title: {
    default: 'Friendly Party Rental NYC | Party Rentals in Riverdale, the Bronx & Lower Westchester',
    template: '%s | Friendly Party Rental NYC',
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'Friendly Party Rental NYC',
    'party rentals Riverdale NY',
    'party rentals Bronx NY',
    'party rentals Yonkers NY',
    'tent rentals Riverdale',
    'bounce house rentals Riverdale NY',
    'table and chair rentals Lower Westchester',
    'wedding rentals Riverdale NY',
  ],
  openGraph: {
    title: 'Friendly Party Rental NYC | Party Rentals in Riverdale, the Bronx & Lower Westchester',
    description: SITE_DESCRIPTION,
    siteName: BUSINESS.name,
    locale: 'en_US',
    type: 'website',
    images: [{ url: SITE_URL + NYC_LOGO_PATH, width: NYC_LOGO_WIDTH, height: NYC_LOGO_HEIGHT, alt: BUSINESS.name, type: 'image/png' }],
  },
  robots: {
    index: INDEXABLE,
    follow: true,
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(LOCAL_BUSINESS_JSONLD) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(WEBSITE_JSONLD) }}
        />
        {GOOGLE_TAG_ID && <>
          <Script id="ga4-init" strategy="beforeInteractive">
            {GOOGLE_TAG_BOOTSTRAP}
          </Script>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}`}
            strategy="lazyOnload"
          />
        </>}
      </head>
      <body className={roboto.className}>
        <GoogleAnalyticsListener />
        <VisitorTracker />
        <CartProvider>
          {children}
          <Toaster position="top-center" />
        </CartProvider>
      </body>
    </html>
  )
}
