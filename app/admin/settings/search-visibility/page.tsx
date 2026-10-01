import Link from 'next/link'
import {getServerSession} from 'next-auth'
import {redirect} from 'next/navigation'
import {authOptions} from '@/lib/auth'
import {getSearchConsoleSummary} from '@/lib/search-console'
import {normalizeNycSearchProperty,NYC_GSC_DOMAIN_PROPERTY,NYC_GSC_URL_PREFIX} from '@/lib/nycSearchReadiness'
import {NYC_SERVICE_AREAS} from '@/lib/nycServiceAreas'
import {NYC_PUBLIC_ORIGIN} from '@/lib/nycPublicOrigin'
import {prisma} from '@/lib/prisma'
export const dynamic='force-dynamic'
export const metadata={title:'Riverdale Google Search Visibility',robots:{index:false,follow:false}}
export default async function SearchVisibilityPage(){
  const session=await getServerSession(authOptions)
  if(!session)redirect('/admin/login')
  if((session.user as {role?:string}).role!=='admin')return <div className="p-6">Administrator access required.</div>
  const configured=normalizeNycSearchProperty(process.env.GSC_SITE_URL || process.env.NYC_GSC_PROPERTY)
  const [report,googleConnection]=await Promise.all([
    getSearchConsoleSummary(28).catch(()=>null),
    prisma.googleCalendarConnection.findUnique({where:{id:'primary'},select:{searchConsoleVerificationFile:true,searchConsoleVerifiedAt:true,scope:true}}).catch(()=>null),
  ])
  const property=configured||NYC_GSC_DOMAIN_PROPERTY
  const resource=encodeURIComponent(property)
  const consoleUrl='https://search.google.com/search-console?resource_id='+resource
  return <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
    <Link href="/admin/settings" className="underline text-blue-700">Back to settings</Link>
    <h1 className="text-2xl font-bold">Google Search Visibility — New York</h1>
    <p>Public pages can be crawlable without being indexed or ranking for every search. Google makes the indexing and ranking decisions. Checkout, customer payments, contracts, staff tools and duplicate booking views are intentionally excluded from search.</p>
    <section className="rounded-xl border p-5 bg-blue-50">
      <h2 className="text-lg font-bold">Google reporting</h2>
      <p className="mt-2 font-semibold">{report?.connected?'Riverdale Search Console query succeeded':'Google indexing and ranking are not verified here'}</p>
      {report?.connected?<><p className="mt-2">{report.totals.clicks.toLocaleString()} clicks and {report.totals.impressions.toLocaleString()} impressions reported for the requested {report.rangeDays}-day window. Recent Google data can be delayed.</p><p className="mt-2">These are search-performance totals, not a count of indexed pages.</p></>:<><p className="mt-2">{report?.reason||'The Google report could not be retrieved. This is not evidence of zero traffic or zero indexed pages.'}</p><a href="/api/admin/google-calendar/connect" className="mt-3 inline-block rounded-lg border border-blue-700 px-4 py-2 font-semibold text-blue-700">Reconnect Google permissions</a></>}
      <a href={consoleUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block rounded-lg bg-blue-700 px-4 py-3 text-white font-semibold">Open New York Search Console</a>
    </section>
    <section className="rounded-xl border p-5">
      <h2 className="text-lg font-bold">NYC site ownership</h2>
      <p className="mt-2 break-all">Automatic URL-prefix property: <code>{NYC_GSC_URL_PREFIX}</code></p>
      <p className="mt-2 break-all">Optional DNS domain property: <code>{NYC_GSC_DOMAIN_PROPERTY}</code></p>
      <p className="mt-3">Ownership status: <strong>{googleConnection?.searchConsoleVerifiedAt?'Verified through Google Site Verification':'Not yet verified through this admin'}</strong>.</p>
      {googleConnection?.searchConsoleVerificationFile&&<p className="mt-2 break-all text-sm">Verification file kept live at <a className="underline text-blue-700" href={'/'+googleConnection.searchConsoleVerificationFile} target="_blank" rel="noopener noreferrer">{NYC_PUBLIC_ORIGIN+'/'+googleConnection.searchConsoleVerificationFile}</a>.</p>}
      <p className="mt-3">The admin uses Google&apos;s FILE verification method for the canonical NYC URL-prefix, so HostGator DNS is not required for this property. Another Friendly Party Rental location does not verify the NYC site.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <form action="/api/admin/search-console/verify" method="post"><button type="submit" className="rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white">Verify / retry NYC Search Console</button></form>
        <a href="/api/admin/google-calendar/connect" className="rounded-lg border border-blue-700 px-4 py-3 font-semibold text-blue-700">Reconnect Google permissions</a>
      </div>
    </section>
    <section className="rounded-xl border p-5">
      <h2 className="text-lg font-bold">Submit and check public pages</h2>
      <p className="mt-2 break-all">Sitemap: <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="underline text-blue-700">{NYC_PUBLIC_ORIGIN + '/sitemap.xml'}</a></p>
      <p className="mt-3">After ownership is verified, submit this sitemap in Search Console and inspect the homepage, key rental categories and nearby-area guides. A sitemap request is not a guarantee of indexing.</p>
      <div className="mt-3 flex flex-wrap gap-4"><a href={'https://search.google.com/search-console/sitemaps?resource_id='+resource} target="_blank" rel="noopener noreferrer" className="underline text-blue-700">Open Google Sitemaps</a><Link href="/service-area" className="underline text-blue-700">Review {NYC_SERVICE_AREAS.length} listed communities</Link><Link href="/category" className="underline text-blue-700">Public rental categories</Link></div>
    </section>
    <section className="rounded-xl border p-5">
      <h2 className="text-lg font-bold">Local business and reporting are separate</h2>
      <p className="mt-2">Search Console reporting is separate from any Google Business Profile. Do not create or claim a physical NYC storefront unless the business actually qualifies for one.</p>
      <p className="mt-3">The saved Google Integration switch is only a settings record. It does not prove Search Console access. This admin now reuses the encrypted business Google OAuth connection used by Calendar. Reconnect Google permissions to grant Search Console read-only access; a service account remains an optional fallback.</p>
      <p className="mt-3">No Google submission, customer email, order or payment is sent by opening this page.</p>
    </section>
  </div>
}
