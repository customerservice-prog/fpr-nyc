import Link from 'next/link'
import type { Metadata } from 'next'
import { safeJsonLd } from '@/lib/jsonLd'

const BASE_URL = 'https://friendlypartyrentalsc.com'

export const metadata: Metadata = {
  title: 'Graduation Party Rentals in Greenville, SC',
    description: 'Graduation party rentals in Greenville, SC and Upstate South Carolina, including tents, tables, chairs, bounce houses, and concessions. Ready-to-book packages or build your own.',
    alternates: { canonical: `${BASE_URL}/graduation-rentals` },
}

export default function GraduationRentalsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Graduation Party Rentals',
    description: 'Graduation party rental packages and equipment in Greenville, SC and Upstate South Carolina.',
    url: `${BASE_URL}/graduation-rentals`,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-dark mb-2">Graduation Party Rentals in Greenville, SC</h1>
        <p className="text-body mb-8">
          Celebrating a Greenville-area graduate? Friendly Party Rental supplies tents, tables, chairs, bounce houses, and concessions for graduation open houses and backyard celebrations throughout Greenville, Greer, Simpsonville, Mauldin, Taylors, Easley, Travelers Rest, Fountain Inn, and Piedmont, SC. Choose one of our ready-to-book graduation packages below, or build your own from our full rental inventory. Delivery, setup, and pickup are included.
        </p>

        <h2 className="font-bold text-dark mb-4 text-xl">Graduation Party Packages</h2>
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <div className="bg-white rounded-lg shadow-lg border-2 border-primary overflow-hidden p-6">
            <h3 className="text-xl font-bold text-dark mb-1">Graduation Party Package - Small (Seats 64)</h3>
            <p className="text-3xl font-bold text-secondary mb-2">$665.00/day</p>
            <p className="text-body text-sm mb-4">
              One 20&#39; x 30&#39; pole tent, 8 six-foot plastic folding tables, and 64 white plastic folding chairs. A great fit for a graduation open house or backyard celebration.
            </p>
            <Link href="/category/party-rental-packages" className="inline-block bg-primary text-white px-4 py-2 rounded font-bold">
              Check Availability &amp; Book
            </Link>
          </div>
          <div className="bg-white rounded-lg shadow-lg border-2 border-primary overflow-hidden p-6">
            <h3 className="text-xl font-bold text-dark mb-1">Graduation Party Package - Large (Seats 100)</h3>
            <p className="text-3xl font-bold text-secondary mb-2">$875.00/day</p>
            <p className="text-body text-sm mb-4">
              One 30&#39; x 30&#39; pole tent, 10 tables, and 100 chairs. Our largest graduation setup for celebrating with a big crowd of family and friends.
            </p>
            <Link href="/category/party-rental-packages" className="inline-block bg-primary text-white px-4 py-2 rounded font-bold">
              Check Availability &amp; Book
            </Link>
          </div>
        </div>

        <p className="text-body text-sm mb-10">
          Need a different guest count? Call us at{' '}
          <a href="tel:315-884-1498" className="text-secondary underline">315-884-1498</a>{' '}
          and we&#39;ll help you size a tent and table/chair count for your graduation party. You can also browse{' '}
          <Link href="/category/party-rental-packages" className="text-secondary underline">all package deals</Link>.
        </p>

        <h2 className="font-bold text-dark mb-4 text-xl">Build Your Own Graduation Party Rental</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-10 text-body">
          <Link href="/category/tent-rentals" className="block bg-white border rounded-lg p-4 hover:shadow-md">Tent Rentals</Link>
          <Link href="/category/table-chair-rentals" className="block bg-white border rounded-lg p-4 hover:shadow-md">Table &amp; Chair Rentals</Link>
          <Link href="/category/bounce-house-rentals" className="block bg-white border rounded-lg p-4 hover:shadow-md">Bounce Houses &amp; Waterslides</Link>
          <Link href="/category/concession-machine-rentals" className="block bg-white border rounded-lg p-4 hover:shadow-md">Concession Machines</Link>
          <Link href="/category/linen-rentals" className="block bg-white border rounded-lg p-4 hover:shadow-md">Linens</Link>
          <Link href="/category/event-lighting-rentals" className="block bg-white border rounded-lg p-4 hover:shadow-md">Event Lighting</Link>
        </div>

        <h2 className="font-bold text-dark mb-4 text-xl">Why Greenville Families Choose Friendly Party Rental</h2>
        <p className="text-body text-sm mb-2">
          Family-owned and operated, based in Greenville, SC, with 10+ years serving Upstate South Carolina. Fully insured, with clean, inspected equipment and dependable delivery and pickup.
        </p>
      </div>
    </>
  )
}
