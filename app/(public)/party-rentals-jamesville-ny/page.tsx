import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Party Rentals in Jamesville, NY',
  description: 'Looking for party rentals near me in Jamesville, NY? Friendly Party Rental delivers tents, tables, chairs, bounce houses, and event equipment throughout Jamesville (13078) and the surrounding southeastern Onondaga County.',
  alternates: { canonical: 'https://www.friendlypartyrental.com/party-rentals-jamesville-ny' },
}

export default function PartyRentalsJamesvillePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
    <h1 className="text-3xl font-bold text-dark mb-6 text-center">
    Party Rentals in Jamesville, NY
    </h1>
    
    <p className="text-body mb-6">
    Searching for party rentals near me in Jamesville? Friendly Party Rental delivers tents, tables, chairs, bounce houses, and other event equipment to Jamesville (13078) and the surrounding southeastern Onondaga County. Whether you are planning a backyard birthday party, a graduation open house, or a wedding reception, our team can help you put together the right equipment for your event.
    </p>
    
    <h2 className="text-xl font-bold text-dark mb-3">Popular Rentals for Jamesville Events</h2>
    <ul className="grid md:grid-cols-2 gap-2 mb-8">
    <li><Link href="/category/tent-rentals" className="text-primary hover:underline">Tent Rentals</Link></li>
    <li><Link href="/category/table-chair-rentals" className="text-primary hover:underline">Table &amp; Chair Rentals</Link></li>
    <li><Link href="/category/bounce-house-rentals" className="text-primary hover:underline">Bounce House Rentals</Link></li>
    <li><Link href="/category/linen-rentals" className="text-primary hover:underline">Linen Rentals</Link></li>
    <li><Link href="/category/dance-floor-stage-rentals" className="text-primary hover:underline">Dance Floor Rentals</Link></li>
    <li><Link href="/wedding-packages" className="text-primary hover:underline">Wedding Rental Packages</Link></li>
    </ul>
    
    <h2 className="text-xl font-bold text-dark mb-3">Why Jamesville Families Choose Friendly Party Rental</h2>
    <p className="text-body mb-6">
    We are a family-owned rental company that has served the greater Syracuse and Central New York area for more than a decade. Our equipment is professionally cleaned and inspected before every delivery, and our delivery and setup crews are background-checked and fully insured, so you can book with confidence.
    </p>
    
    <div className="text-center">
    <p className="text-body mb-4">Not sure what you need? Call or text us at 315-884-1498 and we will help you plan your Jamesville event.</p>
    <Link href="/order-by-date" className="btn-accent">Book Your Jamesville Party Rentals</Link>
    </div>
    </div>
  )
}
