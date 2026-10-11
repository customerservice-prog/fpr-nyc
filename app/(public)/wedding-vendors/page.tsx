import { nycPageMetadata } from '@/lib/nycSeo'
import Link from 'next/link'
import { NYC_SERVICE_AREA_SUMMARY } from '@/lib/nycServiceAreas'
import { BUSINESS } from '@/lib/utils'

export const metadata = nycPageMetadata("/wedding-vendors","Wedding Vendors in Riverdale, Bronx & Lower Westchester","Browse a practical starting list of caterers, DJs, photographers, florists and cake vendors serving the Bronx and Lower Westchester, then coordinate rentals with Friendly Party Rental NYC.")

const vendorGroups = [
  { title:'Catering', vendors:[
    {name:'Plates Catering',href:'https://www.platesonthepark.com/',area:'Larchmont / Westchester',note:'Full-service off-site catering and events.'},
    {name:'Catering By Christine',href:'https://cateringbychristine.com/',area:'Connecticut & New York',note:'Wedding and event catering; confirm service for your venue.'},
  ]},
  { title:'DJ / MC & Entertainment', vendors:[
    {name:"Don't Stop the Music! Inc.",href:'https://dontstop.com/',area:'Yonkers',note:'Wedding DJ / MC and event entertainment.'},
    {name:'Extreme Music Productions L.L.C.',href:'https://www.extrememusicprod.com/',area:'Ardsley / Westchester',note:'DJ / MC with wedding entertainment and production options.'},
  ]},
  { title:'Photography', vendors:[
    {name:'Hillary C. Photography',href:'https://hillarycphotography.com/',area:'White Plains',note:'Wedding and event photography.'},
    {name:'Through the Looking Glass',href:'https://www.throughthelookingglass-photography.com/',area:'Yonkers',note:'Wedding, engagement and milestone-event photography.'},
  ]},
  { title:'Florals & Event Design', vendors:[
    {name:'Bed of Roses Florist',href:'https://www.bedofrosesflorist.com/',area:'Scarsdale / Lower Westchester',note:'Wedding flowers and floral design.'},
    {name:'Gentle Events',href:'https://www.gentleevent.com/',area:'Yonkers',note:'Wedding floral and event design studio.'},
  ]},
  { title:'Wedding Cakes & Desserts', vendors:[
    {name:'Delite Bake Shop',href:'https://delitebakeshop.com/',area:'Yonkers',note:'Custom wedding cakes and celebration desserts.'},
    {name:'Lulu Cake Boutique',href:'https://www.everythinglulu.com/',area:'Scarsdale',note:'Custom wedding and celebration cakes.'},
  ]},
]

export default function WeddingVendorsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-dark mb-6 text-center">Local Wedding Vendor Suggestions</h1>
      <p className="text-body mb-6">Planning a wedding takes more than tents and tables. Friendly Party Rental NYC handles rental equipment, delivery and setup options. These independent businesses are a starting point for other wedding services around Riverdale, the Bronx and Lower Westchester. Follow the links to compare their work and confirm pricing, service area and availability directly. We do not have formal partnerships with these businesses.</p>
      {vendorGroups.map(group => <section key={group.title} className="mb-6">
        <h2 className="text-xl font-bold text-dark mb-3">{group.title}</h2>
        <div className="space-y-3">{group.vendors.map(vendor => <p key={vendor.name} className="text-body">
          <a href={vendor.href} target="_blank" rel="noopener noreferrer" className="underline text-secondary">{vendor.name}</a> ({vendor.area}) — {vendor.note}
        </p>)}</div>
      </section>)}
      <div className="text-center mt-10">
        <p className="text-body mb-4">Share your venue, guest count, vendors and setup schedule so the rentals work with the rest of your team. Serving {NYC_SERVICE_AREA_SUMMARY}. For rental and planning questions, call or text {BUSINESS.phone}.</p>
        <Link href="/event-planning" className="btn-accent">Learn About Event Planning</Link>
      </div>
    </div>
  )
}
