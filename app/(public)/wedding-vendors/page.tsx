import { nycPageMetadata } from '@/lib/nycSeo'
import Link from 'next/link'
import { NYC_SERVICE_AREA_SUMMARY } from '@/lib/nycServiceAreas'
import { BUSINESS } from '@/lib/utils'

export const metadata = nycPageMetadata(
  "/wedding-vendors",
  "Wedding Vendors in the Bronx & Lower Westchester | Friendly Party Rental NYC",
  "Research wedding caterers, DJs, photographers, florists, bakeries and mobile bar services serving Riverdale, the Bronx and Lower Westchester."
)

const groups = [
  {
    title: 'Catering',
    intro: 'Ask about staffing, service style, kitchen needs, rentals, delivery windows and whether the caterer can work from a tented or backyard site.',
    vendors: [
      { name: 'Porto Salvo Catering', area: 'Bronx / Riverdale / Yonkers', note: 'Italian catering for weddings, rehearsal dinners, receptions and cocktail hours.', url: 'https://portosalvonyc.com/catering' },
      { name: 'Green Apple Catering & Events', area: 'Bronx / NYC', note: 'Wedding and event catering with experience in halls, community spaces and sites without a full kitchen.', url: 'https://nygreenapple.com/bronx-wedding-catering-by-us/' },
      { name: 'Neem Indian Cuisine Catering', area: 'Riverdale / Bronx / Yonkers', note: 'Indian catering for weddings, private parties and larger celebrations.', url: 'https://neemindian.com/catering' },
    ],
  },
  {
    title: 'DJ, MC & Event Production',
    intro: 'Confirm ceremony audio, reception sound, MC services, lighting, backup equipment and load-in requirements with the venue.',
    vendors: [
      { name: 'Liquid Sound & Entertainment', area: 'Westchester / NYC', note: 'DJ, MC, audio, lighting, staging, special effects and broader event production.', url: 'https://liquidsoundfx.com/' },
      { name: 'Top Notch Event Planning', area: 'Eastchester / Westchester', note: 'Local entertainment company offering DJ/MC, photo booth, photography and related event services.', url: 'https://www.google.com/search?q=Top+Notch+Event+Planning+417+White+Plains+Rd+Eastchester+NY' },
    ],
  },
  {
    title: 'Photography & Video',
    intro: 'Compare coverage hours, second-shooter options, delivery timelines, albums, video coverage and rights to download/share final files.',
    vendors: [
      { name: 'Photography by Alfonso', area: 'Mamaroneck / Westchester', note: 'Wedding-focused photography studio serving the New York area.', url: 'https://www.photographybyalfonso.com/' },
      { name: 'RealDepthOfField Photography', area: 'New Rochelle / Westchester', note: 'New Rochelle photography studio serving nearby Westchester and Bronx communities.', url: 'https://www.realdepthoffield.com/contact' },
    ],
  },
  {
    title: 'Florals & Event Design',
    intro: 'Bring your ceremony/reception floor plan so the florist can coordinate arches, aisle pieces, centerpieces and installations around the rental layout.',
    vendors: [
      { name: 'New Rochelle Florist', area: 'New Rochelle / Lower Westchester', note: 'Wedding bouquets, ceremony décor, centerpieces and floral installations.', url: 'https://www.newrochelleflorists.com/wedding-flowers' },
      { name: 'Beautiful Blooms Florist & Event Décor', area: 'Yonkers / Westchester', note: 'Custom wedding flowers and event décor with consultation-based design.', url: 'https://www.beautifulbloomsofyonkers.com/page/weddings' },
      { name: 'Gentle Events Florals & Event Design', area: 'Yonkers / Tri-State', note: 'Florals, event design, planning and day-of coordination.', url: 'https://www.gentleevent.com/' },
    ],
  },
  {
    title: 'Wedding Cakes & Desserts',
    intro: 'Confirm serving count, delivery/setup, refrigeration needs, cake-table size and the exact arrival window before event day.',
    vendors: [
      { name: 'Delite Bake Shop', area: 'Yonkers / Southern Westchester / parts of the Bronx', note: 'Long-running Yonkers bakery offering custom and wedding cakes with local delivery.', url: 'https://delitebakeshop.com/gallery/weddings/' },
      { name: 'DeLillo Pastry Shop', area: 'Bronx', note: 'Bronx pastry shop offering celebration and wedding cakes.', url: 'https://www.delillopastryshop.com/' },
    ],
  },
  {
    title: 'Mobile Bar & Bartending',
    intro: 'Ask about staffing ratios, insurance/COI, venue alcohol rules, bar footprint, ice, glassware, mixers and who supplies alcohol.',
    vendors: [
      { name: 'Mobile Bar NYC', area: 'Bronx / NYC / Westchester', note: 'Mobile bars, bartending, cocktail/mocktail service and event beverage carts.', url: 'https://www.mobilebarnyc.com/' },
      { name: 'Velvet Pour', area: 'Bronx / NYC / Westchester', note: 'Wedding bartending and mobile bar service with event coordination options.', url: 'https://velvetpournyc.com/services' },
    ],
  },
]

export default function WeddingVendorsPage() {
  return <main className="bg-slate-50">
    <section className="bg-[#0B1F3A] text-white">
      <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-amber-300">Independent planning directory</p>
        <h1 className="mt-3 text-4xl font-bold">Wedding Vendors Serving the Bronx &amp; Lower Westchester</h1>
        <p className="mt-5 max-w-3xl leading-7 text-white/80">Friendly Party Rental NYC provides the rental equipment. This directory gives couples a practical starting list for other wedding services around Riverdale, the Bronx and Lower Westchester.</p>
      </div>
    </section>
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-10 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm leading-6 text-slate-700">
        <strong className="block text-slate-950">No paid placements or implied partnerships.</strong>
        These businesses are independent providers found through current public research. Friendly Party Rental NYC does not represent or guarantee their pricing, availability, licensing, insurance, quality or performance. Contact each vendor directly and verify current details for your date and venue.
      </div>
      <div className="space-y-10">
        {groups.map(group => <section key={group.title}>
          <h2 className="text-2xl font-bold text-slate-950">{group.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{group.intro}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {group.vendors.map(vendor => <article key={vendor.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-950">{vendor.name}</h3>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-blue-700">{vendor.area}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{vendor.note}</p>
              <a href={vendor.url} target="_blank" rel="noopener noreferrer nofollow" className="mt-4 inline-block font-semibold text-blue-800 underline">Visit vendor website →</a>
            </article>)}
          </div>
        </section>)}
      </div>
      <section className="mt-12 rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-2xl font-bold text-slate-950">Coordinate vendors around the rental plan</h2>
        <p className="mt-3 leading-7 text-slate-600">Before signing vendor contracts, confirm the venue load-in rules and build a working floor plan. Caterers need service space, DJs need power and a clear equipment area, florists need installation time, photographers need room around key moments, and bar teams need a defined footprint. Our event-planning team can help coordinate the rental side of that plan.</p>
        <div className="mt-5 flex flex-wrap gap-3"><Link href="/event-planning" className="btn-accent">Event Planning Help</Link><Link href="/design-your-event" className="btn-primary">Design Your Event</Link></div>
      </section>
      <p className="mt-8 text-sm leading-6 text-slate-600">Need help building the vendor checklist for an event in {NYC_SERVICE_AREA_SUMMARY}? Call or text <a className="underline" href={"tel:"+BUSINESS.phone.replace(/\D/g,'')}>{BUSINESS.phone}</a>.</p>
    </div>
  </main>
}
