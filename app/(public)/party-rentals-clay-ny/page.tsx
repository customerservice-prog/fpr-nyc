import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Party Rentals in Clay, NY',
  description: 'Searching for party rentals near me in Clay, NY? Friendly Party Rental delivers tents, tables, chairs, and event equipment throughout Clay (13041) and the surrounding Central New York area.',
  alternates: { canonical: 'https://www.friendlypartyrental.com/party-rentals-clay-ny' },
}

export default function PartyRentalsClayPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-dark mb-6 text-center">
        Party Rentals in Clay, NY
      </h1>

      <p className="text-body mb-6">
        Friendly Party Rental serves Clay (13041) as part of our Eastern Suburbs delivery zone, providing tents, tables, chairs, bounce houses, and other event essentials for birthdays, graduations, weddings, and backyard gatherings throughout the area.
      </p>

      <h2 className="text-xl font-bold text-dark mb-3">Top Rentals for Clay, NY Events</h2>
      <ul className="grid md:grid-cols-2 gap-2 mb-8">
        <li><Link href="/category/tent-rentals" className="text-primary hover:underline">Tent Rentals</Link></li>
        <li><Link href="/category/table-chair-rentals" className="text-primary hover:underline">Table &amp; Chair Rentals</Link></li>
        <li><Link href="/category/bounce-house-rentals" className="text-primary hover:underline">Bounce House Rentals</Link></li>
        <li><Link href="/category/dance-floor-stage-rentals" className="text-primary hover:underline">Dance Floor Rentals</Link></li>
        <li><Link href="/category/concession-machine-rentals" className="text-primary hover:underline">Concession Machine Rentals</Link></li>
        <li><Link href="/wedding-packages" className="text-primary hover:underline">Wedding Rental Packages</Link></li>
      </ul>

      <h2 className="text-xl font-bold text-dark mb-3">Why Clay Residents Book With Us</h2>
      <p className="text-body mb-6">
        We have served Central New York, including the Clay area, for more than a decade as a family-owned business. Our team is fully insured and background-checked, and every rental is cleaned and inspected before delivery so your event goes smoothly.
      </p>

      <div className="text-center">
        <p className="text-body mb-4">Ready to book? Call or text 315-884-1498 or reserve online.</p>
        <Link href="/order-by-date" className="btn-accent">Book Your Clay Party Rentals</Link>
      </div>
    </div>
  )
}
