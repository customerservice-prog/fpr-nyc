import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Party Rentals in Camillus, NY',
  description: 'Need party rentals near me in Camillus, NY? Friendly Party Rental provides tent, table, chair, and bounce house rentals throughout Camillus (13031) and the greater Syracuse Metro area.',
  alternates: { canonical: 'https://www.friendlypartyrental.com/party-rentals-camillus-ny' },
}

export default function PartyRentalsCamillusPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-dark mb-6 text-center">
        Party Rentals in Camillus, NY
      </h1>

      <p className="text-body mb-6">
        Friendly Party Rental proudly delivers party and event rentals to Camillus (13031) as part of our Syracuse Metro service area. We supply tents, tables, chairs, bounce houses, linens, and other event equipment for birthdays, graduations, weddings, and community events throughout Camillus and the surrounding towns.
      </p>

      <h2 className="text-xl font-bold text-dark mb-3">What Camillus Customers Rent Most</h2>
      <ul className="grid md:grid-cols-2 gap-2 mb-8">
        <li><Link href="/category/tent-rentals" className="text-primary hover:underline">Tent Rentals</Link></li>
        <li><Link href="/category/table-chair-rentals" className="text-primary hover:underline">Table &amp; Chair Rentals</Link></li>
        <li><Link href="/category/bounce-house-rentals" className="text-primary hover:underline">Bounce House Rentals</Link></li>
        <li><Link href="/category/generator-rentals" className="text-primary hover:underline">Generator Rentals</Link></li>
        <li><Link href="/category/linen-rentals" className="text-primary hover:underline">Linen Rentals</Link></li>
        <li><Link href="/wedding-packages" className="text-primary hover:underline">Wedding Rental Packages</Link></li>
      </ul>

      <h2 className="text-xl font-bold text-dark mb-3">Local, Family-Owned Service for Camillus Events</h2>
      <p className="text-body mb-6">
        As a family-owned business serving Central New York for more than ten years, we know what it takes to make a Camillus event run smoothly: clean, inspected equipment, background-checked delivery crews, and full insurance coverage on every job.
      </p>

      <div className="text-center">
        <p className="text-body mb-4">Have questions about delivery to Camillus? Call or text 315-884-1498.</p>
        <Link href="/order-by-date" className="btn-accent">Book Your Camillus Rentals</Link>
      </div>
    </div>
  )
}
