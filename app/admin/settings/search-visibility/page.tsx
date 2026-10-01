import Link from 'next/link'
import {getServerSession} from 'next-auth'
import {redirect} from 'next/navigation'
import {authOptions} from '@/lib/auth'
import {getSearchConsoleSummary} from '@/lib/search-console'
import {normalizeNycSearchProperty,NYC_GSC_DOMAIN_PROPERTY,NYC_GSC_URL_PREFIX} from '@/lib/nycSearchReadiness'
import {NYC_SERVICE_AREAS} from '@/lib/nycServiceAreas'
import {NYC_PUBLIC_ORIGIN} from '@/lib/nycPublicOrigin'
export const dynamic='force-dynamic'
export const metadata={title:'Riverdale Google Search Visibility',robots:{index:false,follow:false}}
export default async function SearchVisibilityPage(){
  const session=await getServerSession(authOptions)
  if(!session)redirect('/admin/login')
  if((session.user as {role?:string}).role!=='admin')return <div className="p-6">Administrator access required.</div>
  const configured=normalizeNycSearchProperty(process.env.GSC_SITE_URL || process.env.NYC_GSC_PROPERTY)
  const hasVerificationTag=Boolean(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim())
  const report=await getSearchConsoleSummary(28).catch(()=>null)
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
      {report?.connected?<><p className="mt-2">{report.totals.clicks.toLocaleString()} clicks and {report.totals.impressions.toLocaleString()} impressions reported for the requested {report.rangeDays}-day window. Recent Google data can be delayed.</p><p className="mt-2">These are search-performance totals, not a count of indexed pages.</p></>:<p className="mt-2">{report?.reason||'The Google report could not be retrieved. This is not evidence of zero traffic or zero indexed pages.'}</p>}
      <a href={consoleUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block rounded-lg bg-blue-700 px-4 py-3 text-white font-semibold">Open New York Search Console</a>
    </section>
    <section className="rounded-xl border p-5">
      <h2 className="text-lg font-bold">Verify the correct property</h2>
      <p className="mt-2 break-all">Domain property: <code>{NYC_GSC_DOMAIN_PROPERTY}</code></p>
      <p className="mt-2 break-all">URL-prefix alternative: <code>{NYC_GSC_URL_PREFIX}</code></p>
      <p className="mt-3">Use the Google account that owns or has permission for the New York website. If Google asks you to add the property, follow its ownership verification. A Search Console property for another Friendly Party Rental location does not verify this separate NYC domain.</p>
      <p className="mt-3">Public HTML verification tag in this deployment: <strong>{hasVerificationTag?'Present; ownership is still confirmed by Google':'Not configured; another valid Google verification method may still be used'}</strong>.</p>
      <p className="mt-3">For the URL-prefix HTML-tag method, Google supplies a public verification token for <code>NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION</code>. Domain verification uses the DNS record Google supplies. Never put passwords, service-account private keys or tokens into public page content.</p>
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
      <p className="mt-3">The saved Google Integration switch is only a settings record. It does not prove Search Console access. To load reporting in this admin, configure an authorized Google service account and set <code>NYC_GSC_PROPERTY</code> (or <code>GSC_SITE_URL</code>) to one of the exact canonical NYC properties shown above; read-only Search Console permission is sufficient for the existing metrics endpoint.</p>
      <p className="mt-3">No Google submission, customer email, order or payment is sent by opening this page.</p>
    </section>
  </div>
}
