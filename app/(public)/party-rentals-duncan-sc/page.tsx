import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Party Rentals in Duncan, SC',
    description: 'Looking for party rentals near me in Duncan, SC? Friendly Party Rental delivers tents, tables, chairs, bounce houses, and event equipment throughout the town of Duncan (29334) and the surrounding Upstate South Carolina area.',
    alternates: { canonical: 'https://www.friendlypartyrentalsc.com/party-rentals-duncan-sc' },
}

export default function PartyRentalsDuncanPage() {
    return (
          <div className="max-w-4xl mx-auto px-4 py-12">
                <h1 className="text-3xl font-bold text-dark mb-6 text-center">
                        Party Rentals in Duncan, SC
                </h1>
          
                <p className="text-body mb-6">
                        Searching for party rentals near me in Duncan? Friendly Party Rental is a family-owned rental company based in Greenville, SC, and we regularly deliver tents, tables, chairs, bounce houses, and event essentials throughout the town of Duncan (29334) as part of our Greenville Metro service zone. Whether you are planning a backyard birthday party, a graduation open house, or a wedding reception, our team can help you put together the right equipment for your event.
                </p>
          
                <h2 className="text-xl font-bold text-dark mb-3">Popular Rentals for Duncan Events</h2>
                <ul className="grid md:grid-cols-2 gap-2 mb-8">
                        <li><Link href="/category/tent-rentals" className="text-primary hover:underline">Tent Rentals</Link></li>
                        <li><Link href="/category/table-chair-rentals" className="text-primary hover:underline">Table & Chair Rentals</Link></li>
                        <li><Link href="/category/bounce-house-rentals" className="text-primary hover:underline">Bounce House Rentals</Link></li>
                        <li><Link href="/category/linen-rentals" className="text-primary hover:underline">Linen Rentals</Link></li>
                        <li><Link href="/category/dance-floor-stage-rentals" className="text-primary hover:underline">Dance Floor Rentals</Link></li>
                        <li><Link href="/wedding-packages" className="text-primary hover:underline">Wedding Rental Packages</Link></li>
                </ul>
          
                <h2 className="text-xl font-bold text-dark mb-3">Why Duncan Families Choose Friendly Party Rental</h2>
                <p className="text-body mb-6">
                        We are family-owned, bringing more than a decade of party rental experience to Duncan and the rest of Upstate South Carolina. Our equipment is professionally cleaned and inspected before every delivery, and our delivery and setup crews are background-checked and fully insured, so you can book with confidence.
                </p>
          
                <div className="text-center">
                        <p className="text-body mb-4">Not sure what you need? Call or text us at 315-884-1498 and we will help you plan your Duncan event.</p>
                        <Link href="/order-by-date" className="btn-accent">Book Your Duncan Party Rentals</Link>
                </div>
          </div>
        )
}
