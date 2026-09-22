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

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
})

const SITE_URL = 'https://www.friendlypartyrentalsc.com'
const SITE_DESCRIPTION =
  'Friendly Party Rental is your local Carolina party rental company providing reliable and affordable party rentals in Greenville, SC and surrounding Upstate South Carolina communities. Tent, bounce house, table and chair rentals with fast online booking.'

const LOCAL_BUSINESS_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': 'https://www.friendlypartyrentalsc.com/#business',
  name: 'Friendly Party Rental',
  image: `${SITE_URL}/images/logo.png`,
  telephone: '+1-864-610-5324',
  email: 'customerservice@friendlypartyrental.com',
  url: SITE_URL,
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Greenville',
    addressRegion: 'SC',
    addressCountry: 'US',
  },
  openingHoursSpecification: [{
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
    opens: '09:00',
    closes: '18:00',
  }],
  areaServed: [{"@type": "Place", "name": "Greenville, SC"}, {"@type": "Place", "name": "Anderson, SC"}, {"@type": "Place", "name": "Belton, SC"}, {"@type": "Place", "name": "Berea, SC"}, {"@type": "Place", "name": "Boiling Springs, SC"}, {"@type": "Place", "name": "Central, SC"}, {"@type": "Place", "name": "Clemson, SC"}, {"@type": "Place", "name": "Duncan, SC"}, {"@type": "Place", "name": "Easley, SC"}, {"@type": "Place", "name": "Fountain Inn, SC"}, {"@type": "Place", "name": "Gantt, SC"}, {"@type": "Place", "name": "Gray Court, SC"}, {"@type": "Place", "name": "Greer, SC"}, {"@type": "Place", "name": "Honea Path, SC"}, {"@type": "Place", "name": "Inman, SC"}, {"@type": "Place", "name": "Judson, SC"}, {"@type": "Place", "name": "Landrum, SC"}, {"@type": "Place", "name": "Laurens, SC"}, {"@type": "Place", "name": "Liberty, SC"}, {"@type": "Place", "name": "Marietta, SC"}, {"@type": "Place", "name": "Mauldin, SC"}, {"@type": "Place", "name": "Parker, SC"}, {"@type": "Place", "name": "Pelzer, SC"}, {"@type": "Place", "name": "Pickens, SC"}, {"@type": "Place", "name": "Piedmont, SC"}, {"@type": "Place", "name": "Powdersville, SC"}, {"@type": "Place", "name": "Seneca, SC"}, {"@type": "Place", "name": "Simpsonville, SC"}, {"@type": "Place", "name": "Six Mile, SC"}, {"@type": "Place", "name": "Spartanburg, SC"}, {"@type": "Place", "name": "Taylors, SC"}, {"@type": "Place", "name": "Travelers Rest, SC"}, {"@type": "Place", "name": "Wade Hampton, SC"}, {"@type": "Place", "name": "Williamston, SC"}, {"@type": "Place", "name": "Woodruff, SC"}],
  priceRange: '$$',
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: 'Friendly Party Rental - South Carolina',
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico?v=sc-20260921', sizes: 'any', type: 'image/x-icon' },
      { url: '/favicon-32x32.png?v=sc-20260921', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png?v=sc-20260921', sizes: '48x48', type: 'image/png' },
      { url: '/favicon-96x96.png?v=sc-20260921', sizes: '96x96', type: 'image/png' },
    ],
    shortcut: '/favicon.ico?v=sc-20260921',
    apple: [{ url: '/apple-touch-icon.png?v=sc-20260921', sizes: '180x180', type: 'image/png' }],
  },
  title: {
    default: 'Friendly Party Rental | Carolina Party Rentals in Greenville, SC',
    template: '%s | Friendly Party Rental',
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'party rentals Greenville SC',
    'Carolina party rental',
    'tent rentals Greenville',
    'bounce house rentals Greenville SC',
    'table and chair rentals Upstate SC',
    'wedding rentals Greenville SC',
  ],
  openGraph: {
    title: 'Friendly Party Rental | Carolina Party Rentals in Greenville, SC',
    description: SITE_DESCRIPTION,
    siteName: 'Friendly Party Rental',
    locale: 'en_US',
    type: 'website',
    images: [{ url: `${SITE_URL}/images/logo.png`, width: 1731, height: 909, alt: 'Friendly Party Rental' }],
  },
  robots: {
    index: true,
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
