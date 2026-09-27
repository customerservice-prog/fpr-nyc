import { scPageMetadata } from '@/lib/scSeo'
import Link from 'next/link'
import type { Metadata } from 'next'
export const metadata = scPageMetadata("/about_us","About Friendly Party Rental NYC in Riverdale, Bronx, NY","Meet Friendly Party Rental NYC serving Riverdale and nearby Downstate New York communities with party and event equipment rentals.")
export default function AboutPage() {
  return <div className="max-w-4xl mx-auto px-4 py-12">
    <div className="text-center mb-12"><h1 className="text-3xl font-bold text-dark mb-3">About Friendly Party Rental NYC</h1><p className="text-body text-lg">Local. Reliable. Clean, event-ready rentals for Riverdale &amp; Downstate New York.</p></div>
    <div className="space-y-6 text-body mb-12">
      <p>Friendly Party Rental NYC is a family-owned party rental business bringing its event-rental experience to Riverdale and Downstate New York. Our NYC / Downstate location helps families, schools, businesses and organizations plan celebrations with reliable equipment and friendly service.</p>
      <p>Our inventory includes tents, tables, chairs, linens, dance floors, generators, event lighting, popcorn machines, cotton candy machines, and much more. Every piece of equipment is professionally cleaned, inspected, and prepared before every rental so your event looks great and runs smoothly.</p>
      <p>We believe event planning should be simple and stress-free. That is why we offer easy online booking, transparent pricing, delivery and collection from your event, and a team that cares about making your event a success. Ask about our <Link href="/event-planning" className="text-secondary underline font-semibold">full-service event planning</Link> for help coordinating the details.</p>
      <p>Whether you are planning a wedding, graduation party, corporate event, birthday celebration or backyard gathering, our team can help you choose equipment and coordinate your setup. Riverdale currently offers delivery only; warehouse pickup is not available.</p>
    </div>
    <div className="grid md:grid-cols-3 gap-6 mb-12">{[{title:'Clean Equipment',desc:'Every item is professionally cleaned and inspected before every rental.'},{title:'Reliable Service',desc:'Delivery and event collection so you can focus on your guests.'},{title:'Easy Booking',desc:'Choose your event date and review availability online.'}].map(card=><div key={card.title} className="bg-primary/10 p-6 rounded-lg text-center border border-primary/30"><h3 className="font-bold text-dark mb-2">{card.title}</h3><p className="text-body text-sm">{card.desc}</p></div>)}</div>
    <div className="text-center"><Link href="/order-by-date" prefetch={false} className="btn-primary inline-block">Book by Date</Link></div>
  </div>
}
