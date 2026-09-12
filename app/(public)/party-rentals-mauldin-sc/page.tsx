import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Party Rentals in Mauldin, SC',
  description: 'Need party rentals near me in Mauldin, SC? Friendly Party Rental provides tent, table, chair, and bounce house rentals throughout Mauldin (29662) and the greater Greenville Metro area.',
  alternates: { canonical: 'https://www.friendlypartyrentalsc.com/party-rentals-mauldin-sc' },
}

export default function PartyRentalsMauldinPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-dark mb-6 text-center">
        Party Rentals in Mauldin, SC
      </h1>

      <p className="text-body mb-6">
        Friendly Party Rental proudly delivers party and event rentals to Mauldin (29662) as part of our Greenville Metro service area. We supply tents, tables, chairs, bounce houses, linens, and other event equipment for birthdays, graduations, weddings, and community events throughout Mauldin and the surrounding towns.
      </p>

      <h2 className="text-xl font-bold text-dark mb-3">What Mauldin Customers Rent Most</h2>
      <ul className="grid md:grid-cols-2 gap-2 mb-8">
        <li><Link href="/category/tent-rentals" className="text-primary hover:underline">Tent Rentals</Link></li>
        <li><Link href="/category/table-chair-rentals" className="text-primary hover:underline">Table &amp; Chair Rentals</Link></li>
        <li><Link href="/category/bounce-house-rentals" className="text-primary hover:underline">Bounce House Rentals</Link></li>
        <li><Link href="/category/generator-rentals" className="text-primary hover:underline">Generator Rentals</Link></li>
        <li><Link href="/category/linen-rentals" className="text-primary hover:underline">Linen Rentals</Link></li>
        <li><Link href="/wedding-packages" className="text-primary hover:underline">Wedding Rental Packages</Link></li>
      </ul>

      <h2 className="text-xl font-bold text-dark mb-3">Local, Family-Owned Service for Mauldin Events</h2>
      <p className="text-body mb-6">
        As a family-owned business serving Upstate South Carolina for more than ten years, we know what it takes to make a Mauldin event run smoothly: clean, inspected equipment, background-checked delivery crews, and full insurance coverage on every job.
      </p>

      <div className="text-center">
        <p className="text-body mb-4">Have questions about delivery to Mauldin? Call or text 864-610-5324.</p>
        <Link href="/order-by-date" className="btn-accent">Book Your Mauldin Rentals</Link>
      </div>
    </div>
  )
}
