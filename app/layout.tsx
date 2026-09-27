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
import { NYC_SITE_URL, NYC_BUSINESS_ID } from '@/lib/nycSeo'
import { NYC_SERVICE_AREAS } from '@/lib/nycServiceAreas'

const roboto=Roboto({weight:['300','400','500','700'],subsets:['latin'],display:'swap'})
const INDEXABLE=process.env.PUBLIC_INDEXABLE==='true'
const SITE_DESCRIPTION='Friendly Party Rental NYC provides party and event rentals across Riverdale, the Northwest Bronx and Lower Westchester, including tents, tables, chairs, inflatables, weddings and event equipment.'
const LOCAL_BUSINESS_JSONLD={
 '@context':'https://schema.org','@type':'LocalBusiness','@id':NYC_BUSINESS_ID,
 name:'Friendly Party Rental NYC',legalName:'Friendly Party Rental L.L.C.',description:SITE_DESCRIPTION,
 image:NYC_SITE_URL+'/images/logo.png',telephone:'+1-315-884-1498',email:'customerservice@friendlypartyrental.com',url:NYC_SITE_URL,
 address:{'@type':'PostalAddress',addressLocality:'Riverdale',addressRegion:'NY',addressCountry:'US'},
 openingHoursSpecification:[{'@type':'OpeningHoursSpecification',dayOfWeek:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],opens:'09:00',closes:'18:00'}],
 areaServed:NYC_SERVICE_AREAS.map(a=>({'@type':'Place',name:a.name+', NY'})),
 hasOfferCatalog:{'@type':'OfferCatalog',name:'Party and event rentals in Riverdale, the Northwest Bronx and Lower Westchester',itemListElement:[
  {'@type':'OfferCatalog',name:'Tent Rentals',url:NYC_SITE_URL+'/category/tent-rentals'},
  {'@type':'OfferCatalog',name:'Table & Chair Rentals',url:NYC_SITE_URL+'/category/table-chair-rentals'},
  {'@type':'OfferCatalog',name:'Bounce House & Water Slide Rentals',url:NYC_SITE_URL+'/category/bounce-house-rentals'},
  {'@type':'OfferCatalog',name:'Wedding Rentals',url:NYC_SITE_URL+'/weddings'}
 ]},priceRange:'$$'
}
const WEBSITE_JSONLD={'@context':'https://schema.org','@type':'WebSite','@id':NYC_SITE_URL+'/#website',url:NYC_SITE_URL,name:'Friendly Party Rental NYC',description:SITE_DESCRIPTION,publisher:{'@id':NYC_BUSINESS_ID}}
export const metadata:Metadata={
 metadataBase:new URL(NYC_SITE_URL),applicationName:'Friendly Party Rental NYC',manifest:'/site.webmanifest',
 icons:{icon:[{url:'/favicon.ico',sizes:'any',type:'image/x-icon'}],shortcut:'/favicon.ico',apple:[{url:'/apple-touch-icon.png',sizes:'180x180',type:'image/png'}]},
 title:{default:'Friendly Party Rental NYC | Party Rentals in Riverdale & Lower Westchester',template:'%s | Friendly Party Rental NYC'},
 description:SITE_DESCRIPTION,
 keywords:['Friendly Party Rental NYC','party rentals Riverdale NY','tent rentals Riverdale','party rentals Yonkers','party rentals Lower Westchester','bounce house rentals Bronx','wedding rentals Westchester'],
 openGraph:{title:'Friendly Party Rental NYC | Party Rentals in Riverdale & Lower Westchester',description:SITE_DESCRIPTION,siteName:'Friendly Party Rental NYC',locale:'en_US',type:'website',images:[{url:NYC_SITE_URL+'/images/logo.png',alt:'Friendly Party Rental NYC'}]},
 robots:{index:INDEXABLE,follow:INDEXABLE},
 verification:{google:process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION},
}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><head>
 <script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(LOCAL_BUSINESS_JSONLD)}}/>
 <script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(WEBSITE_JSONLD)}}/>
 {GOOGLE_TAG_ID&&<><Script id="ga4-init" strategy="beforeInteractive">{GOOGLE_TAG_BOOTSTRAP}</Script><Script src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}`} strategy="lazyOnload"/></>}
 </head><body className={roboto.className}><GoogleAnalyticsListener/><VisitorTracker/><CartProvider>{children}<Toaster position="top-center"/></CartProvider></body></html>}
