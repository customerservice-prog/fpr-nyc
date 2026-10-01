import { nycPageMetadata } from '@/lib/nycSeo'
import Link from 'next/link'
import { NYC_SERVICE_AREA_SUMMARY } from '@/lib/nycServiceAreas'
import { BUSINESS } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata = nycPageMetadata("/wedding-vendors","Wedding Vendors in Riverdale, Bronx & Lower Westchester","Browse a practical starting list of caterers, DJs, photographers, florists and cake vendors serving the Bronx and Lower Westchester, then coordinate rentals with Friendly Party Rental NYC.")

const vendorGroups = [
  { title:'Catering', vendors:[
    {name:'Plates Catering',area:'Larchmont / Westchester',note:'Full-service off-site catering and events.'},
    {name:'Catering By Christine',area:'Westchester service area',note:'Wedding and event catering serving Westchester-area events.'},
  ]},
  { title:'DJ / MC & Entertainment', vendors:[
    {name:"Don't Stop the Music! Inc.",area:'Yonkers',note:'Wedding DJ / MC and event entertainment.'},
    {name:'Extreme Music Productions L.L.C.',area:'Ardsley / Westchester',note:'DJ / MC with wedding entertainment and production options.'},
  ]},
  { title:'Photography', vendors:[
    {name:'Hillary C. Photography',area:'White Plains',note:'Wedding and event photography.'},
    {name:'Through the Looking Glass',area:'Yonkers',note:'Wedding, engagement and milestone-event photography.'},
  ]},
  { title:'Florals & Event Design', vendors:[
    {name:'Bed of Roses Florist',area:'Yonkers',note:'Wedding florals, setup and event design.'},
    {name:'Gentle Events',area:'Yonkers',note:'Wedding floral and event design studio.'},
  ]},
  { title:'Wedding Cakes & Desserts', vendors:[
    {name:'Delite Bake Shop',area:'Yonkers',note:'Wedding cakes with local Southern Westchester / selected Bronx delivery.'},
    {name:'Lulu Cake Boutique',area:'Scarsdale',note:'Custom wedding and celebration cakes.'},
  ]},
]

export default function WeddingVendorsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#C85F00]">Riverdale · Bronx · Lower Westchester</p>
        <h1 className="mt-2 text-3xl font-bold text-dark md:text-4xl">Wedding Vendor Suggestions</h1>
        <p className="mt-5 leading-7 text-body">Friendly Party Rental NYC handles rental equipment, delivery and setup options. The businesses below are a practical research starting point for other wedding services in the same general service region.</p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {vendorGroups.map(group => <section key={group.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-dark">{group.title}</h2>
          <div className="mt-4 space-y-4">{group.vendors.map(vendor => <article key={vendor.name} className="rounded-xl bg-slate-50 p-4">
            <h3 className="font-bold text-slate-950">{vendor.name}</h3>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{vendor.area}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{vendor.note}</p>
          </article>)}</div>
        </section>)}
      </div>

      <section className="mt-10 rounded-2xl bg-amber-50 p-6">
        <h2 className="text-xl font-bold text-slate-950">How to use this list</h2>
        <p className="mt-3 text-sm leading-7 text-slate-700">These are independent businesses found in current public vendor and local-business listings reviewed September 30, 2026. Friendly Party Rental NYC does not claim a partnership, endorsement, availability, pricing or prior installation relationship with them. Confirm current service area, insurance, pricing, contracts and availability directly with each vendor before booking.</p>
      </section>

      <section className="mt-10 grid gap-6 rounded-3xl bg-blue-950 p-7 text-white md:grid-cols-[1fr_auto] md:items-center">
        <div><h2 className="text-2xl font-bold">Coordinate the rentals around the rest of your vendor team</h2><p className="mt-3 max-w-3xl leading-7 text-blue-100">Share your venue, guest count, catering plan, entertainment footprint and setup schedule so tents, tables, chairs, linens, lighting and dance-floor space work with the vendors you hire.</p><p className="mt-3 text-sm text-blue-100">Serving {NYC_SERVICE_AREA_SUMMARY}. For rental questions, call or text {BUSINESS.phone}.</p></div>
        <div className="flex flex-col gap-3"><Link href="/design-your-event" className="rounded-xl bg-amber-300 px-5 py-3 text-center font-bold text-blue-950">Design Your Layout</Link><Link href="/event-planning" className="rounded-xl border border-white/40 px-5 py-3 text-center font-bold">Event Planning Help</Link></div>
      </section>
    </main>
  )
}
