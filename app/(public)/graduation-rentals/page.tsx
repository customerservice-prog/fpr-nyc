import Link from 'next/link'
import { nycPageMetadata, NYC_SITE_URL } from '@/lib/nycSeo'
import { safeJsonLd } from '@/lib/jsonLd'
import { NYC_SERVICE_AREA_SUMMARY } from '@/lib/nycServiceAreas'
import { nycItemPath } from '@/lib/nycItemPath'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import DesignYourEventCTA from '@/components/public/DesignYourEventCTA'

export const metadata = nycPageMetadata(
  '/graduation-rentals',
  'Graduation Party Rentals | Riverdale, Bronx & Lower Westchester',
  'Plan a graduation party with tents, tables, chairs, inflatables and concessions delivered across Riverdale, selected Bronx neighborhoods and Lower Westchester.',
)
export const dynamic = 'force-dynamic'

const graduationPackages = [
  {
    name: 'Graduation Party Package - Small (Seats 64)',
    description: 'One 20′ × 30′ pole tent, eight six-foot plastic folding tables and 64 white plastic folding chairs. A starting point for a graduation open house or backyard celebration.',
  },
  {
    name: 'Graduation Party Package - Large (Seats 100)',
    description: 'One 30′ × 30′ pole tent, ten tables and 100 chairs. A package option for celebrating with a larger group of family and friends.',
  },
]

export default async function GraduationRentalsPage() {
  // Prices and booking links come from published NYC catalog items, just as checkout does.
  const catalogPackages = await prisma.item.findMany({
    where: {
      name: { in: graduationPackages.map(pkg => pkg.name) },
      displayToCustomer: true,
      status: 'Available',
      cost: { gt: 0 },
    },
    select: { id: true, name: true, slug: true, cost: true },
  })
  const packages = graduationPackages.flatMap(pkg => {
    const item = catalogPackages.find(item => item.name === pkg.name && item.slug)
    return item ? [{ ...item, description: pkg.description }] : []
  })
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Graduation Party Rentals',
    description: 'Graduation party rental packages and equipment in Riverdale, the Bronx and Lower Westchester.',
    url: `${NYC_SITE_URL}/graduation-rentals`,
  }

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-dark mb-2">Graduation Party Rentals in Riverdale, the Bronx &amp; Lower Westchester</h1>
      <p className="text-body mb-8">
        Celebrating a Riverdale-area graduate? Friendly Party Rental NYC supplies tents, tables, chairs, bounce houses and concessions for graduation open houses and backyard celebrations in {NYC_SERVICE_AREA_SUMMARY}. Choose a graduation package below or build your own from our rental inventory. Delivery is charged by ZIP code. Review each package for included services and confirm any additional table and chair placement with our team.
      </p>

      <h2 className="font-bold text-dark mb-4 text-xl">Graduation Party Packages</h2>
      <div className="grid md:grid-cols-2 gap-6 mb-10">
        {packages.length ? packages.map(pkg => <article key={pkg.id} className="bg-white rounded-lg shadow-lg border-2 border-primary overflow-hidden p-6">
          <h3 className="text-xl font-bold text-dark mb-1">{pkg.name}</h3>
          <p className="text-3xl font-bold text-secondary mb-2">{formatCurrency(pkg.cost)}<span className="text-base font-normal">/day</span></p>
          <p className="text-body text-sm mb-4">{pkg.description}</p>
          <Link href={nycItemPath(pkg.slug)} className="inline-block bg-primary text-white px-4 py-2 rounded font-bold">Check Availability &amp; Book</Link>
        </article>) : <article className="bg-white rounded-lg shadow-lg border-2 border-primary overflow-hidden p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-dark mb-1">Tent, Table &amp; Chair Packages</h3>
          <p className="text-body text-sm mb-4">Browse current party packages or ask our Riverdale team to build a graduation setup for your guest count and event date.</p>
          <Link href="/category/party-rental-packages" className="inline-block bg-primary text-white px-4 py-2 rounded font-bold">View Party Packages</Link>
        </article>}
      </div>

      <p className="text-body text-sm mb-10">Need a different guest count? Call us at <a href="tel:718-283-4593" className="text-secondary underline">718-283-4593</a> and we&#39;ll help you size a tent and table/chair count for your graduation party. You can also browse <Link href="/category/party-rental-packages" className="text-secondary underline">all package deals</Link>.</p>

      <section className="mb-10" aria-labelledby="graduation-planning-heading">
        <h2 id="graduation-planning-heading" className="font-bold text-dark mb-4 text-xl">Plan the space before you book</h2>
        <p className="text-body text-sm mb-4">For an open house, consider how many guests will be seated at once. Leave room for food, gifts and walkways in addition to tables and chairs. Pole tents require a suitable grass setup area for staking. If your setup is on concrete, contact us about a frame tent option.</p>
        <p className="text-body text-sm mb-4">A package&#39;s chair count does not guarantee that every seating arrangement will fit. Explore your layout, then have our team confirm the tent, usable space, equipment availability and setup requirements for your event date.</p>
        <div className="flex flex-wrap gap-3"><DesignYourEventCTA source="graduation_page" label="Plan My Graduation Layout" /><Link href="/service-area" className="bg-gray-100 rounded-full px-4 py-2 text-blue-700 text-sm font-medium">Estimate your delivery fee</Link></div>
      </section>

      <h2 className="font-bold text-dark mb-4 text-xl">Build Your Own Graduation Party Rental</h2>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-10 text-body">{[['/category/tent-rentals', 'Tent Rentals'], ['/category/table-chair-rentals', 'Table & Chair Rentals'], ['/category/bounce-house-rentals', 'Bounce Houses & Waterslides'], ['/category/concession-machine-rentals', 'Concession Machines'], ['/category/linen-rentals', 'Linens'], ['/category/event-lighting-rentals', 'Event Lighting']].map(([href, label]) => <Link key={href} href={href} className="block bg-white border rounded-lg p-4 hover:shadow-md">{label}</Link>)}</div>

      <h2 className="font-bold text-dark mb-4 text-xl">What Families Can Expect from Friendly Party Rental NYC</h2>
      <p className="text-body text-sm mb-2">Our Riverdale team helps families choose rentals for graduation open houses and backyard celebrations. Compare equipment and prices online, then check your date and delivery fee before booking.</p>
    </div>
  </>
}
