import { nycPageMetadata } from '@/lib/nycSeo'
import Link from 'next/link'
import { NYC_SERVICE_AREA_SUMMARY } from '@/lib/nycServiceAreas'
import type { Metadata } from 'next'

export const metadata = nycPageMetadata("/wedding-vendors","Bronx & Lower Westchester Wedding Vendor Guide","Independent wedding vendor suggestions for couples planning events in the Bronx and Lower Westchester. Compare caterers, DJs, photo/video, florists and bakeries before booking.")

const vendors=[
 {category:'Catering & hospitality',name:'Relish Catering + Hospitality',location:'Bronx, NY',href:'https://relishcaterers.com/',note:'Full-service off-premise catering and event hospitality based in the Bronx.'},
 {category:'DJ / MC',name:'DJ Enoch Service',location:'South Bronx / NYC',href:'https://djenoch.com/weddings',note:'Wedding DJ/MC service with ceremony, cocktail-hour and reception options.'},
 {category:'Photography & videography',name:'Atèpá Media',location:'Bronx, NY',href:'https://www.atepamedia.com/',note:'Bronx-based event and wedding photography/video serving NYC and surrounding areas.'},
 {category:'Florals & event flowers',name:'Baezas Flowers and Decorations',location:'Bronx, NY',href:'https://baezasflowers.com/',note:'Bronx florist serving the Bronx and Westchester with custom floral design, including weddings.'},
 {category:'Wedding cakes & desserts',name:"Conti's Pastry Shoppe",location:'Bronx, NY',href:'https://www.contispastryshoppe.com/',note:'Long-running Bronx bakery offering custom celebration and wedding cakes.'},
]

export default function WeddingVendorsPage() {
 return <main className="mx-auto max-w-6xl px-4 py-12">
  <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#C85F00]">Independent local planning guide</p><h1 className="mt-2 text-3xl font-bold text-dark sm:text-4xl">Wedding Vendors for the Bronx & Lower Westchester</h1><p className="mt-4 leading-7 text-body">Friendly Party Rental NYC provides rental equipment. The companies below are independent businesses couples can compare for services outside our rental scope. We do not receive referral fees and listing a business is not a guarantee of availability, pricing or fit for your event.</p></div>
  <section className="mt-10 grid gap-5 md:grid-cols-2">
   {vendors.map(v=><article key={v.name} className="rounded-2xl border bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-[#C85F00]">{v.category}</p><h2 className="mt-2 text-xl font-bold text-dark">{v.name}</h2><p className="mt-1 text-sm font-medium text-gray-500">{v.location}</p><p className="mt-3 text-sm leading-7 text-body">{v.note}</p><a href={v.href} target="_blank" rel="noopener noreferrer nofollow" className="mt-4 inline-flex min-h-11 items-center font-bold text-secondary underline">Visit vendor website →</a></article>)}
  </section>
  <section className="mt-10 rounded-2xl bg-amber-50 p-6"><h2 className="text-xl font-bold text-dark">Before hiring any wedding vendor</h2><ul className="mt-3 space-y-2 text-sm leading-6 text-body"><li>✓ Confirm the vendor serves your exact venue and event date.</li><li>✓ Ask for a written scope, current pricing, deposits, cancellation terms and insurance requirements.</li><li>✓ Confirm arrival/load-in times with the venue before signing a contract.</li><li>✓ Tell each vendor who is responsible for power, tables, linens, cleanup and trash removal.</li></ul><p className="mt-4 text-xs leading-5 text-gray-600">Public business information was checked in September 2026. Vendor offerings can change; verify current details directly with each company.</p></section>
  <section className="mt-10 text-center"><h2 className="text-2xl font-bold text-dark">Want one team to help coordinate the event?</h2><p className="mx-auto mt-3 max-w-2xl leading-7 text-body">Our event-planning service can help you organize the rental layout, vendor responsibilities and event-day logistics around your selected scope.</p><Link href="/event-planning" className="btn-accent mt-5 inline-block">Learn About Event Planning</Link></section>
  <p className="mx-auto mt-10 max-w-3xl text-center text-xs leading-5 text-gray-500">Serving {NYC_SERVICE_AREA_SUMMARY}. These suggestions are informational and are not formal partnerships or endorsements.</p>
 </main>
}
