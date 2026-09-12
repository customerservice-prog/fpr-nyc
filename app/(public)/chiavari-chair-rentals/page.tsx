import Link from 'next/link'
import type { Metadata } from 'next'
import { safeJsonLd } from '@/lib/jsonLd'

const BASE_URL = 'https://www.friendlypartyrentalsc.com'

export const metadata: Metadata = {
  title: 'Chiavari Chair Rentals in Greenville, SC',
  description: 'Rent gold, white, and mahogany chiavari chairs in Greenville, SC and Upstate South Carolina. Ideal for weddings and upscale events. Fast online booking, delivery, and setup.',
  alternates: { canonical: `${BASE_URL}/chiavari-chair-rentals` },
}

export default function ChiavariChairRentalsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Chiavari Chair Rentals',
    description: 'Chiavari chair rental options in Greenville, SC and Upstate South Carolina.',
    url: `${BASE_URL}/chiavari-chair-rentals`,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-dark mb-2">Chiavari Chair Rentals in Greenville, SC</h1>
        <p className="text-body mb-8">
          Planning a wedding or upscale event in Upstate South Carolina? Friendly Party Rental supplies chiavari chairs in gold, white, and mahogany finishes throughout Greenville, Greer, Simpsonville, Mauldin, Taylors, Easley, Travelers Rest, Fountain Inn, and Piedmont, SC. Choose the finish that fits your event below, or call us to coordinate a large wedding order alongside tables, linens, and a tent.
        </p>

        <h2 className="font-bold text-dark mb-4 text-xl">Chiavari Chair Options</h2>
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white rounded-lg shadow-lg border-2 border-primary overflow-hidden p-4">
            <h3 className="text-xl font-bold text-dark mb-1">Gold Chiavari Chair</h3>
            <p className="text-3xl font-bold text-secondary mb-2">$8.00/day</p>
            <p className="text-body text-sm mb-4">
              A classic gold finish that pairs well with most wedding and gala color schemes.
            </p>
            <Link href="/items/gold-chiavari-chair" className="inline-block bg-primary text-white px-4 py-2 rounded font-bold">
              Check Availability &amp; Book
            </Link>
          </div>
          <div className="bg-white rounded-lg shadow-lg border-2 border-primary overflow-hidden p-4">
            <h3 className="text-xl font-bold text-dark mb-1">White Chiavari Chair</h3>
            <p className="text-3xl font-bold text-secondary mb-2">$7.50/day</p>
            <p className="text-body text-sm mb-4">
              A bright white finish for garden weddings, all-white receptions, and daytime events.
            </p>
            <Link href="/items/white-chiavari-chair" className="inline-block bg-primary text-white px-4 py-2 rounded font-bold">
              Check Availability &amp; Book
            </Link>
          </div>
          <div className="bg-white rounded-lg shadow-lg border-2 border-primary overflow-hidden p-4">
            <h3 className="text-xl font-bold text-dark mb-1">Mahogany Chiavari Chair</h3>
            <p className="text-3xl font-bold text-secondary mb-2">$12.00/day</p>
            <p className="text-body text-sm mb-4">
              A rich mahogany finish for a warmer, more traditional wedding or banquet look.
            </p>
            <Link href="/items/mahogany-chiavari-chair" className="inline-block bg-primary text-white px-4 py-2 rounded font-bold">
              Check Availability &amp; Book
            </Link>
          </div>
        </div>

        <h2 className="font-bold text-dark mb-4 text-xl">Planning a Wedding or Large Event?</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-10 text-body">
          <Link href="/category/table-chair-rentals" className="block bg-white border rounded-lg p-4 hover:shadow-md">All Tables &amp; Chairs</Link>
          <Link href="/category/linen-rentals" className="block bg-white border rounded-lg p-4 hover:shadow-md">Linens</Link>
          <Link href="/category/tent-rentals" className="block bg-white border rounded-lg p-4 hover:shadow-md">Tent Rentals</Link>
          <Link href="/category/dance-floor-stage-rentals" className="block bg-white border rounded-lg p-4 hover:shadow-md">Dance Floor &amp; Stage</Link>
          <Link href="/category/event-lighting-rentals" className="block bg-white border rounded-lg p-4 hover:shadow-md">Event Lighting</Link>
          <Link href="/weddings" className="block bg-white border rounded-lg p-4 hover:shadow-md">Wedding Rentals</Link>
        </div>

        <h2 className="font-bold text-dark mb-4 text-xl">Chiavari Chair Rental FAQ</h2>
        <div className="mb-10 space-y-4">
          <div>
            <p className="font-bold text-dark text-sm">What chiavari chair colors do you have available?</p>
            <p className="text-body text-sm">We stock gold, white, and mahogany chiavari chairs, so you can match your wedding or event color scheme.</p>
          </div>
          <div>
            <p className="font-bold text-dark text-sm">Do you deliver chiavari chairs to my town?</p>
            <p className="text-body text-sm">We regularly deliver to Greenville, Greer, Simpsonville, Mauldin, Taylors, Easley, Travelers Rest, Fountain Inn, and Piedmont, SC. Call (864) 610-5324 if your town isn&#39;t listed — we may still be able to help.</p>
          </div>
          <div>
            <p className="font-bold text-dark text-sm">Can I order chiavari chairs along with tables, linens, and a tent for my wedding?</p>
            <p className="text-body text-sm">Yes. Many couples order chiavari chairs alongside tables, linens, and a tent in one delivery. Call us and we&#39;ll help you plan the full order.</p>
          </div>
        </div>

        <h2 className="font-bold text-dark mb-4 text-xl">Why Greenville Couples Choose Friendly Party Rental</h2>
        <p className="text-body text-sm mb-2">
          Family-owned and operated, based in Greenville, SC, with 10+ years serving Upstate South Carolina. Fully insured, with clean, inspected equipment and dependable delivery and pickup.
        </p>
      </div>
    </>
  )
}
