import type { Metadata } from 'next'
import { Roboto } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import Script from 'next/script'
import { CartProvider } from '@/components/public/CartContext'
import { GA_MEASUREMENT_ID, AW_CONVERSION_ID } from '@/lib/gtag'
import GoogleAnalyticsListener from '@/components/GoogleAnalyticsListener'
import VisitorTracker from '@/components/VisitorTracker'
import './globals.css'
import { safeJsonLd } from '@/lib/jsonLd'

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
})

const SITE_URL = 'https://www.friendlypartyrental.com'
const SITE_DESCRIPTION =
  'Friendly Party Rental provides reliable and affordable party rentals in Syracuse, NY, Minoa, and surrounding Central New York communities. Tent, bounce house, table and chair rentals with fast online booking.'

const LOCAL_BUSINESS_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Friendly Party Rental',
  image: `${SITE_URL}/images/logo.png`,
  telephone: '+1-315-884-1498',
  url: SITE_URL,
  address: {
    '@type': 'PostalAddress',
      streetAddress: '330 Costello Parkway',
    addressLocality: 'Minoa',
    addressRegion: 'NY',
    addressCountry: 'US',
    postalCode: '13116',
  },
  areaServed: [
    'Syracuse, NY',
    'Minoa, NY',
    'Cicero, NY',
    'Manlius, NY',
    'Camillus, NY',
    'Baldwinsville, NY',
    'Clay, NY',
    'Cazenovia, NY',
    'Liverpool, NY',
  ],
  priceRange: '$$',
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Friendly Party Rental | Party Rentals in Syracuse, NY',
    template: '%s | Friendly Party Rental',
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'party rentals Syracuse NY',
    'tent rentals Syracuse',
    'bounce house rentals Syracuse',
    'table and chair rentals CNY',
    'wedding rentals Syracuse',
    'Minoa party rentals',
  ],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: 'Friendly Party Rental | Party Rentals in Syracuse, NY',
    description: SITE_DESCRIPTION,
    url: SITE_URL,
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
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
            gtag('config', '${AW_CONVERSION_ID}');
          `}
        </Script>
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
