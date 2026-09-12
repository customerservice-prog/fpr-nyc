import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Party Rentals in Travelers Rest, SC',
  description: 'Looking for party rentals near me in Travelers Rest, SC? Friendly Party Rental delivers tents, tables, chairs, bounce houses, and linens throughout the 29690 area for weddings, graduations, and backyard parties.',
  alternates: {
    canonical: 'https://www.friendlypartyrentalsc.com/party-rentals-travelers-rest-sc',
  },
};

export default function PartyRentalsTravelersRestPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-dark mb-6 text-center">Party Rentals in Travelers Rest, SC</h1>
      <p className="text-body mb-6">
        Searching for party rentals near me in Travelers Rest? Friendly Party Rental is a family-owned rental company serving Travelers Rest (29690) and the greater Greenville Metro area. From backyard birthdays to graduation open houses to full wedding receptions, we deliver, set up, and pick up tents, tables, chairs, bounce houses, and linens so you can focus on hosting.
      </p>
      <h2 className="text-xl font-bold text-dark mb-3">Popular Rentals for Travelers Rest Events</h2>
      <div className="grid md:grid-cols-2 gap-2 mb-8">
        <Link href="/category/tent-rentals" className="text-primary hover:underline">Tent Rentals</Link>
        <Link href="/category/table-chair-rentals" className="text-primary hover:underline">Table &amp; Chair Rentals</Link>
        <Link href="/category/bounce-house-rentals" className="text-primary hover:underline">Bounce House Rentals</Link>
        <Link href="/category/linen-rentals" className="text-primary hover:underline">Linen Rentals</Link>
        <Link href="/category/dance-floor-stage-rentals" className="text-primary hover:underline">Dance Floor Rentals</Link>
        <Link href="/wedding-packages" className="text-primary hover:underline">Wedding Rental Packages</Link>
      </div>
      <h2 className="text-xl font-bold text-dark mb-3">Why Travelers Rest Families Choose Friendly Party Rental</h2>
      <p className="text-body mb-6">
        We have proudly served the greater Greenville area, including Travelers Rest, for more than a decade. We are fully insured, our delivery team is background-checked, and we bring the same attention to detail to a small backyard party as we do to a 200-guest wedding.
      </p>
      <div className="text-center">
        <p className="text-body mb-4">Not sure what you need? Call or text us at 864-610-5324 and we will help you plan your Travelers Rest event.</p>
        <Link href="/order-by-date" className="btn-accent">Book Your Travelers Rest Party Rentals</Link>
      </div>
    </div>
  );
}
