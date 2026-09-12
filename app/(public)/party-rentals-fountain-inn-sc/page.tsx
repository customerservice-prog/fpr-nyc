import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Party Rentals in Fountain Inn, SC',
  description: 'Party rentals near me in Fountain Inn, SC (29644) — Friendly Party Rental delivers tents, tables, chairs, bounce houses, and linens for weddings, graduation parties, and backyard celebrations.',
  alternates: {
    canonical: 'https://www.friendlypartyrentalsc.com/party-rentals-fountain-inn-sc',
  },
};

export default function PartyRentalsFountainInnPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-dark mb-6 text-center">Party Rentals in Fountain Inn, SC</h1>
      <p className="text-body mb-6">
        Planning an event in Fountain Inn (29644)? Friendly Party Rental is a family-owned rental company delivering tents, tables, chairs, bounce houses, and linens throughout Fountain Inn and the greater Greenville Metro area. Whether it is a graduation party, a wedding reception, or a birthday celebration, our team handles delivery, setup, and pickup from start to finish.
      </p>
      <h2 className="text-xl font-bold text-dark mb-3">Popular Rentals for Fountain Inn Events</h2>
      <div className="grid md:grid-cols-2 gap-2 mb-8">
        <Link href="/category/tent-rentals" className="text-primary hover:underline">Tent Rentals</Link>
        <Link href="/category/table-chair-rentals" className="text-primary hover:underline">Table &amp; Chair Rentals</Link>
        <Link href="/category/bounce-house-rentals" className="text-primary hover:underline">Bounce House Rentals</Link>
        <Link href="/category/linen-rentals" className="text-primary hover:underline">Linen Rentals</Link>
        <Link href="/category/dance-floor-stage-rentals" className="text-primary hover:underline">Dance Floor Rentals</Link>
        <Link href="/wedding-packages" className="text-primary hover:underline">Wedding Rental Packages</Link>
      </div>
      <h2 className="text-xl font-bold text-dark mb-3">Why Fountain Inn Families Choose Friendly Party Rental</h2>
      <p className="text-body mb-6">
        We have proudly served the greater Greenville area, including Fountain Inn, for more than a decade. We are fully insured, our delivery team is background-checked, and we bring the same care to a small backyard gathering as we do to a large wedding reception.
      </p>
      <div className="text-center">
        <p className="text-body mb-4">Not sure what you need? Call or text us at 864-610-5324 and we will help you plan your Fountain Inn event.</p>
        <Link href="/order-by-date" className="btn-accent">Book Your Fountain Inn Party Rentals</Link>
      </div>
    </div>
  );
}
