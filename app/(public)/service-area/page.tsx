import Link from 'next/link'
import DeliveryFeeChecker from '@/components/public/DeliveryFeeChecker'
import ServiceAreaDirectory from '@/components/public/ServiceAreaDirectory'
import {scPageMetadata,scBreadcrumbs,SC_BUSINESS_ID,scUrl} from '@/lib/scSeo'
import {SC_SERVICE_AREAS} from '@/lib/scServiceAreas'
import {safeJsonLd} from '@/lib/jsonLd'
export const metadata=scPageMetadata('/service-area','Party Rental Delivery Areas — Greenville & Upstate SC','Check party rental delivery for Greenville and 34 nearby Upstate South Carolina communities. Find your city, browse rentals and estimate your travel fee.')
export default function ServiceAreaPage(){
 const schema={'@context':'https://schema.org','@type':'Service','@id':scUrl('/service-area')+'#delivery',name:'Party rental delivery in Greenville and Upstate South Carolina',serviceType:'Party and event equipment rental delivery',provider:{'@id':SC_BUSINESS_ID},areaServed:SC_SERVICE_AREAS.map(a=>({'@type':'Place',name:a.name+', SC'})),url:scUrl('/service-area')}
 return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(schema)}}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(scBreadcrumbs([{name:'Home',path:'/'},{name:'South Carolina Delivery Areas',path:'/service-area'}]))}}/><DeliveryFeeChecker/>
  <div className="mx-auto max-w-4xl px-4 py-10"><h2 className="mb-5 text-center text-3xl font-bold text-dark">Party Rental Delivery — Greenville, SC &amp; Nearby Communities</h2><p className="text-body leading-7">Find your community below to explore tents, tables, chairs, inflatables, linens and event equipment. We serve these communities from our Greenville operation; each town is a delivery area, not a separate warehouse or storefront.</p><p className="mt-4 text-body leading-7">Your final delivery arrangements depend on your event address, date, access and the equipment selected. Travel fees and tax are separate. Customer pickup at the warehouse is not available. Use the estimate tool or call <a href="tel:+18646105324" className="underline">864-610-5324</a> to confirm details.</p></div>
  <ServiceAreaDirectory/><div className="mx-auto mb-10 flex max-w-4xl flex-wrap justify-center gap-4 px-4"><Link href="/category/tent-rentals" className="btn-primary">Browse Tents</Link><Link href="/category/table-chair-rentals" className="btn-primary">Tables &amp; Chairs</Link><Link href="/order-by-date" className="btn-accent">Check Your Event Date</Link></div></>
}
