import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Party Rentals in Simpsonville, SC',
  description: 'Party rentals near me in Simpsonville, SC: Friendly Party Rental delivers tents, tables, chairs, bounce houses, and wedding rental equipment throughout Simpsonville (29680) and the surrounding Greenville Metro area.',
  alternates: { canonical: 'https://www.friendlypartyrentalsc.com/party-rentals-simpsonville-sc' },
}

export default function PartyRentalsSimpsonvillePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-dark mb-6 text-center">
        Party Rentals in Simpsonville, SC
      </h1>

      <p className="text-body mb-6">
        Planning an event in Simpsonville? Friendly Party Rental is a family-owned party and event rental company based in Greenville, SC, delivering tents, tables, chairs, and more throughout Simpsonville (29680) as part of our Greenville Metro service area. From backyard birthday parties to full wedding receptions, we help Simpsonville families and businesses put on events without the stress of sourcing equipment from multiple vendors.
      </p>

      <h2 className="text-xl font-bold text-dark mb-3">Popular Simpsonville Event Rentals</h2>
      <ul className="grid md:grid-cols-2 gap-2 mb-8">
        <li><Link href="/wedding-packages" className="text-primary hover:underline">Wedding Rental Packages</Link></li>
        <li><Link href="/category/tent-rentals" className="text-primary hover:underline">Tent Rentals</Link></li>
        <li><Link href="/category/table-chair-rentals" className="text-primary hover:underline">Table &amp; Chair Rentals</Link></li>
        <li><Link href="/category/dance-floor-stage-rentals" className="text-primary hover:underline">Dance Floor Rentals</Link></li>
        <li><Link href="/category/bounce-house-rentals" className="text-primary hover:underline">Bounce House Rentals</Link></li>
        <li><Link href="/category/photobooth-rentals" className="text-primary hover:underline">Photobooth Rentals</Link></li>
      </ul>

      <h2 className="text-xl font-bold text-dark mb-3">Trusted by Simpsonville Families for Over a Decade</h2>
      <p className="text-body mb-6">
        Friendly Party Rental has been serving Upstate South Carolina, including Simpsonville, for more than ten years. We are fully insured, our crews are background-checked, and every piece of equipment is cleaned and inspected before it leaves our warehouse.
      </p>

      <div className="text-center">
        <p className="text-body mb-4">Call or text 864-610-5324 to check availability for your Simpsonville event.</p>
        <Link href="/order-by-date" className="btn-accent">Check Simpsonville Availability</Link>
      </div>
    </div>
  )
}
